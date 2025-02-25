import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin: string, callback: any) => {
      if (
        !origin ||
        origin.includes('localhost:') ||
        origin.includes('127.0.0.1:')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.use(cookieParser(process.env.COOKIE_SIGNING_KEY));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
