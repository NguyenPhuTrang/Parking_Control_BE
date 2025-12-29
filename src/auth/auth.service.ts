import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async login(username: string, password: string) {
        const u = username.trim().toLowerCase();

        const user = await this.usersService.findByUsername(u);
        if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) throw new UnauthorizedException('Invalid credentials');

        const payload = { sub: user._id.toString(), username: user.username, role: user.role };
        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            user: { id: user._id.toString(), username: user.username, role: user.role },
        };
    }
}
