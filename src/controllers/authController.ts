import { createClient } from "@supabase/supabase-js";
import { getRoles } from "../utils/queryRoles.js";
import { env } from "cloudflare:workers";
import type { Request, Response } from "express";
import type { CustomError } from "../types/customError.js";

const login = async (req: Request, res: Response) => {
  try {
    const token = req.body.token;

    if (!token) {
      return res.status(400).json({ error: "Missing payload" });
    }

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseKey = env.SUPABASE_ANON_KEY!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabaseClient.auth.signInWithIdToken({
      provider: "google",
      token: token,
    });

    if (error) {
      const error: CustomError = new Error(
        "Error autenticando con Google"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    const email = data.user.email;
    const fullName = data.user.user_metadata.full_name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const userId = data.user.id;

    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      console.log(checkError);
      const error: CustomError = new Error(
        "Error al verificar usuario"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    if (!existingUser) {
      const { error: insertError } = await supabaseAdmin.from("users").insert([
        {
          id: userId,
          email: email,
          name: firstName,
          last_name: lastName,
        },
      ]);

      if (insertError) {
        console.log(insertError);
        const error: CustomError = new Error(
          "Error insertando usuario"
        ) as CustomError;
        error.status = 500;
        throw error;
      }
    }

    const roles = await getRoles(supabaseAdmin, userId);

    return res.status(200).json({
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user: {
        id: userId,
        email: data.user.email,
        avatar: data.user.user_metadata.avatar_url,
        fullName: data.user.user_metadata.full_name,
        firstName: existingUser ? existingUser.name : firstName,
        lastName: existingUser ? existingUser.last_name : lastName,
      },
      roles: roles,
    });
  } catch (error: any) {
    return res
      .status(error.status || 401)
      .json({ error: error.message || "Unauthorized" });
  }
};

export { login };
