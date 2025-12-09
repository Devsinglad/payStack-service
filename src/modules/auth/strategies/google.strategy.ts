import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from 'src/config/app.config';
import { AuthService } from '../auth.service';

/**
 * Google OAuth strategy for authentication
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private usersService: AuthService,
  ) {
    const auth = configService.get<AppConfig>('app');
    super({
      clientID: auth?.googleClientId || '',
      clientSecret: auth?.googleClientSecret || '',
      callbackURL:
        auth?.googleCallbackUrl || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  /**
   * Validate user from Google profile
   * @param accessToken - Google access token
   * @param refreshToken - Google refresh token
   * @param profile - Google profile information
   * @returns User object
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const { id, emails, name, profileUrl } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      throw new Error('No email found in Google profile');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format in Google profile');
    }

    // Check if user already exists in our database
    let user;
    try {
      const existingUser = await this.usersService.findByEmail(email);
      // If user exists but doesn't have Google ID, update their record
      if (!existingUser.googleId) {
        user = await this.usersService.addGoogleId(existingUser.id, id);
      } else {
        const { password: _, ...userWithoutPassword } = existingUser;
        user = userWithoutPassword;
      }
    } catch (error) {
      // User doesn't exist, create a new one
      const fullName = [name?.givenName, name?.familyName]
        .filter((part) => !!part?.trim())
        .join(' ')
        .trim();

      user = await this.usersService.createFromGoogle({
        email,
        fullName: fullName || email.split('@')[0],
        googleId: id,
        profileImage: profileUrl,
      });
    }

    return user;
  }
}
