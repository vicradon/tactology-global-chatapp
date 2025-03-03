import * as cookieParser from 'cookie-parser';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  let allowedOrigins = [];

  try {
    if (process.env.ALLOWED_ORIGINS) allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS);
  } catch (error) {
    console.error('Ensure that ALLOWED_ORIGINS is a valid JSON array');
  }

  app.enableCors({
    origin: (origin: string, callback: any) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.use(cookieParser(process.env.COOKIE_SIGNING_KEY));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
