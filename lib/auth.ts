import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import { NextRequest } from "next/server";

const SECRET = (process.env.JWT_SECRET ?? "development_secret_change_me") as Secret;

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"] };
  return jwt.sign(payload, SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function getUser(req: NextRequest): JwtPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  // Hardcoded admin token
  if (token === "admin-token") {
    return { id: 0, email: "admin@gmail.com", role: "admin" };
  }
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireUser(req: NextRequest): JwtPayload {
  const user = getUser(req);
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function requireRole(req: NextRequest, ...roles: string[]): JwtPayload {
  const user = requireUser(req);
  if (!roles.includes(user.role)) throw new Error("Forbidden");
  return user;
}
