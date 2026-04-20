import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from './env';
import { User } from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.googleClientId,
      clientSecret: env.googleClientSecret,
      callbackURL: env.googleCallbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email provided by Google.'));
        }

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if a user with this email already exists (e.g., signed up via GitHub)
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            user.avatar = user.avatar || profile.photos?.[0]?.value || '';
            await user.save();
          } else {
            user = await User.create({
              googleId: profile.id,
              email,
              displayName: profile.displayName || email.split('@')[0],
              avatar: profile.photos?.[0]?.value || '',
              role: 'free',
            });
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// GitHub OAuth — only register if credentials are configured
if (env.githubClientId && env.githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.githubClientId,
        clientSecret: env.githubClientSecret,
        callbackURL: env.githubCallbackUrl,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email provided by GitHub. Make sure your GitHub email is public or grant email scope.'));
          }

          let user = await User.findOne({ githubId: profile.id });

          if (!user) {
            // Check if a user with this email already exists (e.g., signed up via Google)
            user = await User.findOne({ email });
            if (user) {
              user.githubId = profile.id;
              user.avatar = user.avatar || profile.photos?.[0]?.value || '';
              await user.save();
            } else {
              user = await User.create({
                githubId: profile.id,
                email,
                displayName: profile.displayName || profile.username || email.split('@')[0],
                avatar: profile.photos?.[0]?.value || '',
                role: 'free',
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// No session serialization — we use JWTs
passport.serializeUser((_user, done) => done(null, null));
passport.deserializeUser((_id, done) => done(null, null));
