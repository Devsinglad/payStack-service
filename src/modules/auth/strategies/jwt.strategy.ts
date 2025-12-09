import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/app.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const config = configService.get<AppConfig>('app');
    const jwtSecret = config?.jwtSecret || 'default-secret-key';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    this.logger.log(
      `JWT Strategy initialized with secret: ${jwtSecret.substring(0, 3)}...`,
    );
  }

  async validate(payload: any) {
    this.logger.log(`JWT Payload received: ${JSON.stringify(payload)}`);

    if (!payload.sub || !payload.email) {
      this.logger.error('Invalid JWT payload: missing sub or email');
      throw new Error('Invalid JWT payload structure');
    }

    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
