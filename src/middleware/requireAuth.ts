import type {
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express";
import { env } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";

export interface AuthenticatedRequest extends ExpressRequest {
  userId?: string;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    //@ts-ignore
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "No se proporcionó un token de autenticación válido" });
    }

    const token = authHeader.split(" ")[1];
    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL;
    //@ts-ignore
    const supabaseKey = env.SUPABASE_SECRET_KEY;

    const supabaseClient = createClient(supabaseUrl, supabaseKey)!;
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Error de autenticación" });
  }
};
