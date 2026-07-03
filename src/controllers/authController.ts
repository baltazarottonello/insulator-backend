import { createClient } from "@supabase/supabase-js";
import { getRoles } from "../utils/queryRoles.js";
import { env } from "cloudflare:workers";
import type { Request, Response } from "express";

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

    if (error) throw error;

    const email = data.user.email;
    const fullName = data.user.user_metadata.full_name || "";
    const userId = data.user.id;

    if (email) {
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (checkError) {
        console.error("Error al verificar usuario:", checkError);
        throw checkError;
      }

      if (!existingUser) {
        const nameParts = fullName.trim().split(/\s+/);

        const firstName = nameParts[0] || "";

        const lastName = nameParts.slice(1).join(" ") || "";

        const { error: insertError } = await supabaseAdmin
          .from("users")
          .insert([
            {
              id: userId,
              email: email,
              name: firstName,
              last_name: lastName,
            },
          ]);

        if (insertError) {
          const errorMsg = "Error insertando usuario:";
          console.error(errorMsg, insertError);
          const customError = { ...insertError, code: 500, message: errorMsg };
          throw customError;
        }
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
      },
      roles: roles,
    });
  } catch (error: any) {
    console.log(error);
    return res
      .status(error.status || 401)
      .json({ error: error.message || "Unauthorized" });
  }
};

export { login };
