import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Whitelist, WhitelistDocument } from './whitelist.schema';
import { CreateWhitelistDto } from './dto/create-whitelist.dto';
import { UpdateWhitelistDto } from './dto/update-whitelist.dto';

function normalizePlate(value: string) {
    return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

type StatusFilter = 'all' | 'active' | 'expired' | 'inactive';

@Injectable()
export class WhitelistService {
    constructor(
        @InjectModel(Whitelist.name)
        private whitelistModel: Model<WhitelistDocument>,
    ) { }

    async findAll(params: {
        search?: string;
        status?: StatusFilter;
        page?: number;
        limit?: number
    }) {
        const { search, status = 'all' } = params;
        const page = Math.max(1, params.page || 1);
        const limit = Math.max(1, Math.min(params.limit || 50, 500));
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (search) {
            filter.plate = { $regex: normalizePlate(search), $options: 'i' };
        }

        // Logic lọc trạng thái
        const now = new Date();
        if (status === 'active') {
            filter.active = true;
            filter.$or = [{ validTo: { $exists: false } }, { validTo: { $gte: now } }];
        } else if (status === 'expired') {
            filter.validTo = { $lt: now };
        } else if (status === 'inactive') {
            filter.active = false;
        }

        const [items, total] = await Promise.all([
            this.whitelistModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.whitelistModel.countDocuments(filter),
        ]);

        return {
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async create(dto: CreateWhitelistDto, createdByUserId?: string) {
        const plate = normalizePlate(dto.plate);
        if (!plate) throw new BadRequestException('Plate is required');

        const exists = await this.whitelistModel.findOne({ plate }).lean();
        if (exists) throw new ConflictException('Plate already exists');

        const doc = await this.whitelistModel.create({
            ...dto,
            plate,
            active: dto.active ?? true,
            validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
            validTo: dto.validTo ? new Date(dto.validTo) : undefined,
            createdBy: createdByUserId ? new Types.ObjectId(createdByUserId) : undefined,
        });

        return doc.toObject();
    }

    async update(id: string, dto: UpdateWhitelistDto) {
        const updateData: any = { ...dto };

        if (dto.plate !== undefined) {
            const plate = normalizePlate(dto.plate);
            if (!plate) throw new BadRequestException('Plate is invalid');

            const exists = await this.whitelistModel.findOne({ plate }).lean();
            if (exists && String(exists._id) !== id) {
                throw new ConflictException('Plate already exists');
            }
            updateData.plate = plate;
        }

        if (dto.validFrom !== undefined) updateData.validFrom = dto.validFrom ? new Date(dto.validFrom) : undefined;
        if (dto.validTo !== undefined) updateData.validTo = dto.validTo ? new Date(dto.validTo) : undefined;

        const doc = await this.whitelistModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .lean();

        if (!doc) throw new NotFoundException('Whitelist entry not found');
        return doc;
    }

    async toggle(id: string) {
        const doc = await this.whitelistModel.findById(id);
        if (!doc) throw new NotFoundException('Whitelist entry not found');

        doc.active = !doc.active;
        await doc.save();
        return doc.toObject();
    }

    async remove(id: string) {
        const result = await this.whitelistModel.findByIdAndDelete(id).lean();
        if (!result) throw new NotFoundException('Whitelist entry not found');
        return { deleted: true, id };
    }

    async findByPlateNormalized(plateNormalized: string) {
        return this.whitelistModel.findOne({ plate: plateNormalized }).lean();
    }
}