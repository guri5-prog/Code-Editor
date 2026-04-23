import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from './env.js';
import { authService } from '../services/auth.service.js';

export function configurePassport(): void {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${env.SERVER_URL}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email from Google'));
            }
            const user = await authService.findOrCreateOAuthUser({
              email,
              displayName: profile.displayName || email,
              avatar: profile.photos?.[0]?.value,
              provider: 'google',
              providerId: profile.id,
            });
            done(null, user as Express.User);
          } catch (err) {
            done(err as Error);
          }
        },
      ),
    );
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          callbackURL: `${env.SERVER_URL}/api/auth/github/callback`,
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: {
            id: string;
            username?: string;
            displayName?: string;
            emails?: Array<{ value: string }>;
            photos?: Array<{ value: string }>;
          },
          done: (err: Error | null, user?: Express.User) => void,
        ) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No verified email from GitHub'));
            }
            const user = await authService.findOrCreateOAuthUser({
              email,
              displayName: profile.displayName || profile.username || email,
              avatar: profile.photos?.[0]?.value,
              provider: 'github',
              providerId: profile.id,
            });
            done(null, user as Express.User);
          } catch (err) {
            done(err as Error);
          }
        },
      ),
    );
  }
}
