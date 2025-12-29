import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { History, HistoryDocument } from './history.schema';
import { HistoryQueryDto } from './dto/history-query.dto';

export type CheckReason = 'MATCHED' | 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED';

export type CheckSource = 'MANUAL' | 'OCR';

function normalizePlate(value: string) {
    return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

@Injectable()
export class HistoryService {
    constructor(
        @InjectModel(History.name)
        private readonly historyModel: Model<HistoryDocument>,
    ) { }

    async createLog(params: {
        plate: string;
        allowed: boolean;
        reason: CheckReason;
        checkedBy: string; 
        whitelistRef?: string;

        source?: 'MANUAL' | 'OCR';
        imageUrl?: string;
        confidence?: number;
    }) {
        return this.historyModel.create({
            plate: normalizePlate(params.plate),
            allowed: params.allowed,
            reason: params.reason,
            checkedBy: new Types.ObjectId(params.checkedBy),
            whitelistRef: params.whitelistRef
                ? new Types.ObjectId(params.whitelistRef)
                : undefined,

            source: params.source ?? 'MANUAL',
            imageUrl: params.imageUrl ?? null,
            confidence: params.confidence ?? null,
        });
    }

    async queryLogs(options: {
        query: HistoryQueryDto;
        role: 'ADMIN' | 'STAFF';
        userId: string;
        limit?: number;
        page?: number;
    }) {
        const { query, role, userId } = options;

        const limit = Math.min(Number(options.limit ?? 50), 200);
        const page = Math.max(Number(options.page ?? 1), 1);
        const skip = (page - 1) * limit;

        const filter: any = {};

        /**
         * STAFF chỉ xem lịch sử của chính mình
         */
        if (role === 'STAFF') {
            filter.checkedBy = new Types.ObjectId(userId);
        }

        /**
         * Search theo plate
         */
        if (query.search) {
            filter.plate = {
                $regex: normalizePlate(query.search),
                $options: 'i',
            };
        }

        /**
         * Filter theo kết quả
         */
        if (query.result === 'allowed') filter.allowed = true;
        if (query.result === 'denied') filter.allowed = false;

        /**
         * Filter theo source (MANUAL | OCR)
         */
        if (query.source) {
            filter.source = query.source;
        }

        /**
         * Filter theo khoảng thời gian
         */
        const createdAt: any = {};
        if (query.from) createdAt.$gte = new Date(query.from);
        if (query.to) createdAt.$lte = new Date(query.to);
        if (Object.keys(createdAt).length > 0) {
            filter.createdAt = createdAt;
        }

        const [items, total] = await Promise.all([
            this.historyModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('checkedBy', 'username role') 
                .lean(),

            this.historyModel.countDocuments(filter),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };

    }

}
