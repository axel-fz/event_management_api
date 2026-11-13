import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { parseDurationToSeconds } from '../common/utils/duration.util';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawSecret =
          configService.get<string>('jwt.secret') ||
          process.env.JWT_SECRET ||
          'super_secret_jwt_key_at_least_32_characters_long_for_dev_environment';
        const secret = String(rawSecret)
          .replace(/^['"]|['"]$/g, '')
          .trim();

        const rawExpiresIn =
          configService.get<unknown>('jwt.expiresIn') ||
          process.env.JWT_EXPIRES_IN;
        const expiresIn = parseDurationToSeconds(rawExpiresIn);

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
