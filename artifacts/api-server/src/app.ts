import crypto from "node:crypto";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

type CreateAppOptions = {
  apiPrefix?: string;
};

const sessionCookieName = "glam_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;

function csv(value?: string) {
  return value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
}

function resolveAllowedOrigins() {
  const origins = csv(process.env.GLAM_CORS_ORIGINS ?? process.env.CORS_ORIGIN);
  return origins.length > 0 ? origins : null;
}

function createCorsMiddleware() {
  const allowedOrigins = resolveAllowedOrigins();

  return cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  });
}

function sessionSecret() {
  return process.env.GLAM_SESSION_SECRET ?? process.env.GLAM_ADMIN_PASSWORD;
}

function sessionEnabled() {
  return Boolean(process.env.GLAM_ADMIN_PASSWORD);
}

function signSession(expiresAt: number) {
  const secret = sessionSecret();
  if (!secret) return null;
  const body = String(expiresAt);
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifySession(token?: string) {
  const secret = sessionSecret();
  if (!secret || !token) return false;

  const [expiresAtText, signature] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (!expiresAtText || !signature || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(expiresAtText).digest("base64url");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function cookieOptions() {
  const secure = process.env.GLAM_COOKIE_SECURE === "true";

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" as const : "lax" as const,
    path: process.env.GLAM_COOKIE_PATH ?? "/",
    maxAge: sessionDurationMs,
  };
}

function authRequiredMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!sessionEnabled()) {
    next();
    return;
  }

  if (req.path === "/healthz" || req.path === "/session") {
    next();
    return;
  }

  if (verifySession(req.cookies?.[sessionCookieName])) {
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}

function registerSessionRoutes(api: express.Router) {
  api.get("/session", (req, res) => {
    const authRequired = sessionEnabled();
    res.json({
      authenticated: authRequired ? verifySession(req.cookies?.[sessionCookieName]) : true,
      authRequired,
    });
  });

  api.post("/session", (req, res) => {
    const password = String(req.body?.password ?? "");
    const expectedPassword = process.env.GLAM_ADMIN_PASSWORD;

    if (!expectedPassword) {
      res.json({ authenticated: true, authRequired: false });
      return;
    }

    if (
      password.length !== expectedPassword.length ||
      !crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword))
    ) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const token = signSession(Date.now() + sessionDurationMs);
    if (!token) {
      res.status(500).json({ error: "Session secret is not configured" });
      return;
    }

    res.cookie(sessionCookieName, token, cookieOptions());
    res.json({ authenticated: true, authRequired: true });
  });

  api.delete("/session", (_req, res) => {
    res.clearCookie(sessionCookieName, { path: process.env.GLAM_COOKIE_PATH ?? "/" });
    res.sendStatus(204);
  });
}

export function createApp(options: CreateAppOptions = {}) {
  const app: Express = express();
  const apiPrefix = options.apiPrefix ?? process.env.API_PREFIX ?? "/api";
  const api = express.Router();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(createCorsMiddleware());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  registerSessionRoutes(api);
  api.use(authRequiredMiddleware);
  api.use(router);
  app.use(apiPrefix, api);

  return app;
}

const app = createApp();
export default app;
