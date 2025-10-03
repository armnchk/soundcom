import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be provided");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const getGoogleStrategy = memoize(
  () => {
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/api/callback";
    return new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
        try {
          const email = profile.emails && profile.emails[0]?.value;
          const firstName = profile.name?.givenName;
          const lastName = profile.name?.familyName;
          const profileImageUrl = profile.photos && profile.photos[0]?.value;

          const userId = profile.id; // Use Google subject as stable id

          await storage.upsertUser({
            id: userId,
            email,
            firstName,
            lastName,
            profileImageUrl,
          } as any);

          const user = {
            id: userId,
            claims: { sub: userId, email, first_name: firstName, last_name: lastName },
          } as any;

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    );
  },
  { maxAge: 60 * 60 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const strategy = getGoogleStrategy();
  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser(async (user: Express.User, cb) => {
    try {
      // Загружаем актуальные данные пользователя из базы данных
      const freshUser = await storage.getUser(user.id);
      if (freshUser) {
        // Обновляем данные пользователя актуальными данными из БД
        const updatedUser = {
          ...user,
          claims: {
            ...user.claims,
            first_name: freshUser.first_name,
            last_name: freshUser.last_name,
            email: freshUser.email,
          },
          nickname: freshUser.nickname,
          is_admin: freshUser.is_admin,
        };
        cb(null, updatedUser);
      } else {
        cb(null, user);
      }
    } catch (error) {
      console.error('Error deserializing user:', error);
      cb(null, user);
    }
  });

  app.get("/api/login", (req, res, next) => {
    const scope = ["openid", "email", "profile"];
    passport.authenticate("google", { scope, prompt: "consent" })(req, res, next);
  });

  app.get(
    "/api/callback",
    (req, res, next) => {
      passport.authenticate("google", {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    }
  );

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};


