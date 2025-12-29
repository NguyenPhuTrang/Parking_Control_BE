import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AlprController } from './alpr.controller';
import { AlprService } from './alpr.service';

const uploadPath = join(process.cwd(), 'uploads');

if (!existsSync(uploadPath)) {
  mkdirSync(uploadPath, { recursive: true });
}

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, cb) => {
          const ext = file.originalname.split('.').pop();
          const name = `plate-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}.${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('Only image files allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  ],
  controllers: [AlprController],
  providers: [AlprService],
  exports: [AlprService],
})
export class AlprModule { }
