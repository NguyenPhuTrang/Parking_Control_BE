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

    async findAll(params: { search?: string; status?: StatusFilter }) {
        const search = params.search?.trim();
        const status = (params.status || 'all') as StatusFilter;

        const filter: any = {};
        if (search) filter.plate = { $regex: normalizePlate(search), $options: 'i' };

        const now = new Date();

        if (status === 'active') {
            filter.active = true;
            filter.$or = [{ validTo: { $exists: false } }, { validTo: { $gte: now } }];
        }
        if (status === 'expired') {
            filter.validTo = { $lt: now };
        }
        if (status === 'inactive') {
            filter.active = false;
        }

        return this.whitelistModel.find(filter).sort({ createdAt: -1 }).lean();
    }

    async create(dto: CreateWhitelistDto, createdByUserId?: string) {
        const plate = normalizePlate(dto.plate);
        if (!plate) throw new BadRequestException('plate is required');

        const exists = await this.whitelistModel.findOne({ plate }).lean();
        if (exists) throw new ConflictException('plate already exists');

        const doc = await this.whitelistModel.create({
            plate,
            owner: dto.owner,
            note: dto.note,
            active: dto.active ?? true,
            validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
            validTo: dto.validTo ? new Date(dto.validTo) : undefined,
            createdBy: createdByUserId ? new Types.ObjectId(createdByUserId) : undefined,
        });

        return doc.toObject();
    }

    async update(id: string, dto: UpdateWhitelistDto) {
        const update: any = { ...dto };

        if (dto.plate !== undefined) {
            const plate = normalizePlate(dto.plate);
            if (!plate) throw new BadRequestException('plate is invalid');

            const exists = await this.whitelistModel.findOne({ plate }).lean();
            if (exists && String(exists._id) !== id) throw new ConflictException('plate already exists');

            update.plate = plate;
        }

        if (dto.validFrom !== undefined) update.validFrom = dto.validFrom ? new Date(dto.validFrom) : undefined;
        if (dto.validTo !== undefined) update.validTo = dto.validTo ? new Date(dto.validTo) : undefined;

        const doc = await this.whitelistModel.findByIdAndUpdate(id, update, { new: true }).lean();
        if (!doc) throw new NotFoundException('whitelist not found');
        return doc;
    }

    async toggle(id: string) {
        const doc = await this.whitelistModel.findById(id);
        if (!doc) throw new NotFoundException('whitelist not found');
        doc.active = !doc.active;
        await doc.save();
        return doc.toObject();
    }

    async remove(id: string) {
        const doc = await this.whitelistModel.findByIdAndDelete(id).lean();
        if (!doc) throw new NotFoundException('whitelist not found');
        return { deleted: true };
    }

    async findByPlateNormalized(plateNormalized: string) {
        return this.whitelistModel.findOne({ plate: plateNormalized }).lean();
    }
}
