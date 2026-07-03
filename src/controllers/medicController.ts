import { createClient } from "@supabase/supabase-js";
import { getRoles } from "../utils/queryRoles.js";
import { env } from "cloudflare:workers";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

const getPatients = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const medicUserId = req.userId;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseKey = env.SUPABASE_ANON_KEY!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: medicData, error: medicDataError } = await supabaseAdmin.rpc(
      "get_medic_id_from_user_id",
      { param_user_id: medicUserId }
    );

    if (medicDataError) {
      const error: CustomError = new Error(
        "Error al obtener datos del médico"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    const medicId = medicData?.[0]?.medic_id;

    console.log(medicId);

    if (!medicId) {
      const error: CustomError = new Error() as CustomError;
      error.status = 404;
      throw error;
    }

    const { data: patientsData, error: patientsError } =
      await supabaseAdmin.rpc("get_patients_with_params_for_medic", {
        param_medic_id: medicId,
      });

    if (patientsError) {
      const error: CustomError = new Error(
        "Error al obtener datos del paciente"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    console.log(patientsData);

    return res.status(200).json(patientsData);
  } catch (error: any) {
    console.log(error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Server error" });
  }
};

export { getPatients };

type CustomError = { status: number } & Error;
