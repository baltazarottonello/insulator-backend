import { createClient } from "@supabase/supabase-js";
import { getRoles } from "../utils/queryRoles.js";
import { env } from "cloudflare:workers";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

const getPatients = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const medicUserId = req.requesterUserId;

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

    if (!medicId) {
      const error: CustomError = new Error(
        "El usuario no es médico"
      ) as CustomError;
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

    return res.status(200).json(patientsData);
  } catch (error: any) {
    console.log(error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Server error" });
  }
};

const checkUserAvailability = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const email = req.query.email;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: availabilityData, error: availabilityQueryError } =
      await supabaseAdmin.rpc("check_if_a_user_is_eligible_to_be_a_patient", {
        param_user_email: email,
      });

    if (availabilityQueryError) {
      const error: CustomError = new Error(
        "Error al consultar el usuario"
      ) as CustomError;
      error.status = 500;
      console.log(availabilityQueryError.details);
      throw error;
    }

    return res.status(200).json(availabilityData);
  } catch (error: any) {
    console.log(error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Server error" });
  }
};

const assignPatient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, hasBeenPatient } = req.body;

    const medicUserId = req.requesterUserId;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: medicIdData, error: medicIdDataError } =
      await supabaseAdmin.rpc("get_medic_id_from_user_id", {
        param_user_id: medicUserId,
      });

    const medicId = medicIdData?.[0]?.medic_id;

    if (!medicId) {
      const error: CustomError = new Error(
        "El usuario no es médico"
      ) as CustomError;
      error.status = 404;
      throw error;
    }

    const { data: assignPatientData, error: assignPatientQueryError } =
      await supabaseAdmin.rpc("assign_patient", {
        param_user_id: userId,
        param_medic_id: medicId,
        has_been_patient: hasBeenPatient,
      });

    if (assignPatientQueryError) {
      const error: CustomError = new Error(
        "Error al asignar usuario como paciente"
      ) as CustomError;
      error.status = 500;
      console.log(assignPatientQueryError.details);
      throw error;
    }

    return res.status(200).json(assignPatientData);
  } catch (error: any) {
    console.log(error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Server error" });
  }
};

export { getPatients, checkUserAvailability, assignPatient };

type CustomError = { status: number } & Error;
