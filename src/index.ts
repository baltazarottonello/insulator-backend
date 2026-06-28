import { env } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifyAppHeader } from "./middleware/headers.js";
import { getRoles } from "./utils/queryRoles.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "./middleware/requireAuth.js";

const app = express();

app.use(express.json());
app.use(verifyAppHeader);

app.post("/auth", async (req, res) => {
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
        email: data.user.email,
        avatar: data.user.user_metadata.avatar_url,
        fullName: data.user.user_metadata.full_name,
      },
      roles: roles,
    });
  } catch (error: any) {
    return res
      .status(error.status || 401)
      .json({ error: error.message || "Unauthorized" });
  }
});

app.get("/patient", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const email = req.query.email;
    const medicUserId = req.userId;

    if (!email) {
      return res
        .status(400)
        .json({ error: "El email del paciente es requerido" });
    }

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: relationship, error: relError } = await supabaseAdmin
      .from("medics_patients")
      .select(
        `
        patient_id,
        medics!inner (
          user_id
        ),
        patients!inner (
          users!inner (
            email
          )
        )
      `
      )
      .eq("medics.user_id", medicUserId)
      .eq("patients.users.email", email)
      .maybeSingle();

    if (relError) throw relError;

    if (!relationship) {
      return res.status(403).json({
        error:
          "No autorizado. El paciente no pertenece a tu nómina o no existe.",
      });
    }

    // @ts-ignore
    const targetPatientId = relationship.patient_id;

    const { data: params, error: paramsError } = await supabaseAdmin
      .from("patients_params")
      .select("ratio, sensitivity, target_glucose")
      .eq("patient_id", targetPatientId)
      .eq("is_active", true)
      .maybeSingle();

    if (paramsError) throw paramsError;

    if (!params) {
      return res.status(404).json({
        error:
          "El paciente pertenece al médico, pero aún no tiene parámetros asignados",
      });
    }

    return res.status(200).json({
      patientId: targetPatientId,
      parameters: {
        ratio: params.ratio,
        sensitivity: params.sensitivity,
        targetGlucose: params.target_glucose,
      },
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error.message || "Internal Server Error" });
  }
});

app.get(
  "/patient/params",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId;

      //@ts-ignore
      const supabaseUrl = env.SUPABASE_URL!;
      //@ts-ignore
      const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

      const { data: patient, error: patientError } = await supabaseAdmin
        .from("patients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (patientError) throw patientError;

      if (!patient) {
        return res.status(404).json({
          error: "No existe un registro de paciente asociado a este usuario",
        });
      }

      const { data: params, error: paramsError } = await supabaseAdmin
        .from("patients_params")
        .select("ratio, sensitivity, target_glucose")
        .eq("patient_id", patient.id)
        .eq("is_active", true)
        .maybeSingle();

      if (paramsError) throw paramsError;

      if (!params) {
        return res.status(404).json({
          error: "Aún no tenés parámetros asignados",
        });
      }

      return res.status(200).json({
        parameters: {
          ratio: params.ratio,
          sensitivity: params.sensitivity,
          targetGlucose: params.target_glucose,
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: error.message || "Internal Server Error" });
    }
  }
);

app.post(
  "/patient/params",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body;
      const patientId = body.patientId;
      const { ratio, sensitivity, targetGlucose } = body.parameters;
      const medicUserId = req.userId;

      if (!patientId) {
        return res
          .status(400)
          .json({ error: "El id del paciente es requerido" });
      }

      if (ratio == null || sensitivity == null || targetGlucose == null) {
        return res
          .status(400)
          .json({ error: "ratio, sensitivity y targetGlucose son requeridos" });
      }

      //@ts-ignore
      const supabaseUrl = env.SUPABASE_URL!;
      //@ts-ignore
      const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

      // Validamos que el paciente pertenezca a la nómina del médico autenticado
      const { data: relationship, error: relError } = await supabaseAdmin
        .from("medics_patients")
        .select(
          `
            patient_id,
            medics!inner(user_id)
          `
        )
        .eq("medics.user_id", medicUserId)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (relError) throw relError;

      console.log(relationship);
      if (!relationship) {
        return res.status(403).json({
          error:
            "No autorizado. El paciente no pertenece a tu nómina o no existe.",
        });
      }

      // @ts-ignore
      const targetPatientId = relationship.patient_id;

      // Desactivamos el registro de parámetros activo anterior (si existe)
      const { error: deactivateError } = await supabaseAdmin
        .from("patients_params")
        .update({ is_active: false })
        .eq("patient_id", targetPatientId)
        .eq("is_active", true);

      if (deactivateError) throw deactivateError;

      // Insertamos el nuevo registro activo
      const { data, error: insertError } = await supabaseAdmin
        .from("patients_params")
        .insert({
          patient_id: targetPatientId,
          ratio,
          sensitivity,
          target_glucose: targetGlucose,
          is_active: true,
        })
        .select("ratio, sensitivity, target_glucose")
        .single();

      if (insertError) throw insertError;

      console.log("SUCCESS");
      return res.status(204).send();
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: error.message || "Internal Server Error" });
    }
  }
);

app.all("/", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.listen(3000);

export default httpServerHandler({ port: 3000 });
