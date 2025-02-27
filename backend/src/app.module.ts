import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayModule } from './gateway/gateway.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { databaseConfig } from './config/database.config';
import { RoomModule } from './rooms/room.module';
import { SeedModule } from './seed/seed.module';
import { join } from 'node:path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'src/graphql-schema.ts'),
      },
      subscriptions: {
        'subscriptions-transport-ws': {
          onConnect: (connectionParams) => {
            const authToken = connectionParams['Authorization'];
            if (authToken) {
              // Extract and verify token here
              return { token: authToken };
            }
            throw new Error('Missing auth token');
          },
        },
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    EventEmitterModule.forRoot(),
    GatewayModule,
    AuthModule,
    UsersModule,
    RoomModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
