import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlprService } from './alpr.service';
import type { Express } from 'express';

function safeName(originalName: string) {
  const ext = extname(originalName || '').toLowerCase() || '.jpg';
  const base = `plate-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${base}${ext}`;
}

@Controller('alpr')
@UseGuards(JwtAuthGuard)
export class AlprController {
  constructor(private readonly alprService: AlprService) {}

  @Post('recognize')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, join(process.cwd(), 'uploads')),
        filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed') as any, false);
        }
        cb(null, true);
      },
    }),
  )
  async recognize(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image is required');

    const imageUrl = `/uploads/${file.filename}`;
    const ocr = await this.alprService.recognizePlateFromFile(file.path);

    return { imageUrl, result: ocr };
  }
}
