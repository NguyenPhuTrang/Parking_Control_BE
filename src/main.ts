import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // ✅ dùng NestExpressApplication để serve static
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });

  const port = Number(config.get('PORT') || 4000);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
