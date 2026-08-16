import { createClient } from "@supabase/supabase-js";
import { env } from "cloudflare:workers";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import type { CustomError } from "../types/customError.js";

const loadDose = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.requesterUserId;

    const {
      bloodGlucose,
      carbs,
      ratio,
      sensitivity,
      targetGlucose,
      doseCorrection,
      foodDose,
      dose,
      observations,
      createdAt,
    } = req.body;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: loadDoseData, error: loadDoseError } =
      await supabaseAdmin.rpc("insert_dose", {
        param_user_id: userId,
        param_blood_glucose: bloodGlucose,
        param_carbs: carbs,
        param_ratio: ratio,
        param_sensitivity: sensitivity,
        param_target_glucose: targetGlucose,
        param_dose_correction: doseCorrection,
        param_food_dose: foodDose,
        param_dose: dose,
        param_observations: observations,
        param_created_at: createdAt,
      });

    if (loadDoseError) {
      const error: CustomError = new Error(
        "Error al cargar la dosis"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    const [{ out_user_id }] = loadDoseData;

    return res.status(200).json({ userId: out_user_id });
  } catch (error: any) {
    return res
      .status(error.status || 401)
      .json({ error: error.message || "Unauthorized" });
  }
};

const updateProfileData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.requesterUserId;

    const { firstName, lastName } = req.body;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: updateProfileData, error: updateProfileError } =
      await supabaseAdmin.rpc("update_profile_data", {
        param_user_id: userId,
        param_first_name: firstName,
        param_last_name: lastName,
      });

    if (updateProfileError) {
      const error: CustomError = new Error(
        "Error al actualizar datos del perfil"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    const [{ out_user_id }] = updateProfileData;

    return res.status(200).json({ userId: out_user_id });
  } catch (error: any) {
    return res
      .status(error.status || 401)
      .json({ error: error.message || "Unauthorized" });
  }
};

const deleteUserData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.requesterUserId;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: deleteUserData, error: deleteUserError } =
      await supabaseAdmin.rpc("delete_user_data", { param_user_id: userId });

    if (deleteUserError) {
      const error: CustomError = new Error(
        "Error al eliminar usuario"
      ) as CustomError;
      error.status = 500;
      throw error;
    }

    return res.sendStatus(204);
  } catch (error: any) {
    return res
      .status(error.status || 401)
      .json({ error: error.message || "Unauthorized" });
  }
};

export { loadDose, updateProfileData, deleteUserData };
