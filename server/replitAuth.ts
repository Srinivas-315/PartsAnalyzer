// At the top of replitAuth.ts (or in a separate types.d.ts file)
import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      name: string;
      email: string;
      role?: "admin" | "user" | "service-provider";
    };
  }
}


import type { Express, RequestHandler } from "express";
import session from "express-session";

/**
 * Configure session storage — for local development only
 */
export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET || "local-dev-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false, // HTTPS not needed in dev
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  });
}

/**
 * Sets up mock authentication middleware
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Simulate login
  app.get("/api/login", (req, res) => {
    req.session.user = {
      id: "local-dev-user",
      name: "Local Developer",
      email: "developer@example.com",
      role: "admin", // Change to 'user' or 'service-provider' to test
    };
    res.redirect("/");
  });

  // Simulate logout
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  // Simulate callback
  app.get("/api/callback", (_req, res) => {
    res.redirect("/");
  });
}

/**
 * Auth middleware: allow only if user session exists
 */
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session?.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
