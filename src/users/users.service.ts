import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
    constructor(
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
    ) { }

    async onModuleInit() {
        await this.createIfNotExists('admin', '123456', 'ADMIN');
        await this.createIfNotExists('staff', '123456', 'STAFF');
    }

    private async createIfNotExists(
        username: string,
        password: string,
        role: UserRole,
    ) {
        const exist = await this.userModel.findOne({ username });
        if (exist) return;

        const hash = await bcrypt.hash(password, 10);
        await this.userModel.create({
            username,
            passwordHash: hash,
            role,
            isActive: true,
        });
    }

    findByUsername(username: string) {
        return this.userModel.findOne({ username });
    }


    async createStaff(username: string, password: string) {
        const u = username.trim().toLowerCase();

        const exist = await this.userModel.findOne({ username: u }).lean();
        if (exist) throw new ConflictException('username already exists');

        const passwordHash = await bcrypt.hash(password, 10);

        const doc = await this.userModel.create({
            username: u,
            passwordHash,
            role: 'STAFF',
            isActive: true,
        });

        return { id: doc._id.toString(), username: doc.username, role: doc.role, isActive: doc.isActive };
    }

    async listUsers() {
        return this.userModel
            .find({}, { passwordHash: 0 })
            .sort({ createdAt: -1 })
            .lean();
    }

    async setActive(id: string, isActive: boolean) {
        const doc = await this.userModel.findByIdAndUpdate(
            id,
            { isActive },
            { new: true, projection: { passwordHash: 0 } },
        ).lean();

        return doc;
    }

}
