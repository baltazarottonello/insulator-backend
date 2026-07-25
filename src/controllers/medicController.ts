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

const getPatientParamsHistory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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

const getPatientDoseHistory = async (req: Request, res: Response) => {
  try {
    const patientId = req.query.id;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: userIdData, error: userIdDataError } =
      await supabaseAdmin.rpc("get_user_id_from_patient_id", {
        param_patient_id: patientId,
      });

    const [{ out_user_id }] = userIdData;

    if (userIdDataError) {
      const error: CustomError = new Error(
        "Error al obtener el id de usuario"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    const { data: userDoseHistoryData, error: userDoseHistoryError } =
      await supabaseAdmin.rpc("get_user_doses_history", {
        param_user_id: out_user_id,
      });

    if (userDoseHistoryError) {
      const error: CustomError = new Error(
        "Error al obtener el historial de dosis"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    const groupDoseRegisters = (row: PatientDoseHistoryRow) => {
      return {
        bloodGlucose: row.out_blood_glucose,
        carbs: row.out_carbs,
        ratio: row.out_ratio,
        sensitivity: row.out_sensitivity,
        targetGlucose: row.out_target_glucose,
        doseCorrection: row.out_dose_correction,
        foodDose: row.out_food_dose,
        observations: row.out_observations,
        dose: row.out_dose,
        createdAt: row.out_created_at,
      };
    };

    const result = {
      userId: out_user_id,
      patientId: patientId,
      history: userDoseHistoryData.map(groupDoseRegisters),
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
  getPatientDoseHistory,
};

type CustomError = { status: number } & Error;

type PatientParamsHistoryRow = {
  out_sensitivity: number;
  out_ratio: number;
  out_target_glucose: number;
  out_created_at: string;
  out_is_active: boolean;
};

type PatientDoseHistoryRow = {
  out_blood_glucose: number;
  out_carbs: number;
  out_ratio: number;
  out_sensitivity: number;
  out_target_glucose: number;
  out_dose_correction: number;
  out_food_dose: number;
  out_dose: number;
  out_observations: string;
  out_created_at: string;
};
