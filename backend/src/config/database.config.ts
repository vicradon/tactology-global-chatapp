import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: configService.get('DB_TYPE', 'postgres') as any,
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_NAME', 'chat_app'),
  entities: [join(__dirname, '..', '**/*.entity{.ts,.js}')],
  synchronize: true,
  // configService.get('NODE_ENV') !== 'production', deal with migrations later
  logging: configService.get('DB_LOGGING', 'false') === 'true',
  extra: {
    ssl: configService.get('DB_SSL_REQUIRE', 'false') === 'true',
  },
});
