import type { Request, Response, NextFunction } from "express";
import { env } from "cloudflare:workers";

export const verifyAppHeader = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const xAppHeader = req.headers["x-app"];

  //@ts-ignore
  const headerValue = env.X_APP_HEADER!;

  if (!xAppHeader || xAppHeader !== headerValue) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
