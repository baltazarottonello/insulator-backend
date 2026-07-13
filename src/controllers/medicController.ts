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
      throw error;
    }

    return res.status(200).json(availabilityData);
  } catch (error: any) {
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
      throw error;
    }

    return res.status(200).json(assignPatientData);
  } catch (error: any) {
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Server error" });
  }
};

const getPatientParamsHistory = async (req: Request, res: Response) => {
  try {
    const patientId = req.query.id;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: patientParamsHistoryData, error: patientParamsHistoryError } =
      await supabaseAdmin.rpc("get_patient_params_history", {
        param_patient_id: patientId,
      });

    if (patientParamsHistoryError) {
      const error: CustomError = new Error(
        "Error al obtener historial de los parametros del paciente"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    const groupParamsRegisters = (row: PatientParamsHistoryRow) => {
      return {
        sensitivity: row.out_sensitivity,
        ratio: row.out_ratio,
        targetGlucose: row.out_target_glucose,
        createdAt: row.out_created_at,
        isActive: row.out_is_active,
      };
    };

    const result = {
      patientId: patientParamsHistoryData[0].out_patient_id,
      history: patientParamsHistoryData.map(groupParamsRegisters),
    };

    return res.status(200).json(result);
  } catch (error: any) {
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Server error" });
  }
};

export {
  getPatients,
  checkUserAvailability,
  assignPatient,
  getPatientParamsHistory,
};

type CustomError = { status: number } & Error;

type PatientParamsHistoryRow = {
  out_sensitivity: number;
  out_ratio: number;
  out_target_glucose: number;
  out_created_at: string;
  out_is_active: boolean;
};
