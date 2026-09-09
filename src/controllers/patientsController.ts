import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import type { Response } from "express";
import { env } from "cloudflare:workers";
import type { PatientMedicRow } from "../types/patient.js";
import type { CustomError } from "../types/customError.js";

//TODO: this method should be in medic controllers
const getPatientByEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.query.email;
    const medicUserId = req.requesterUserId;

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
};

const getParams = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.requesterUserId;

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
};

//TODO : USE RPC
const setParams = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const patientId = body.patientId;
    const { ratio, sensitivity, targetGlucose } = body.parameters;
    const medicUserId = req.requesterUserId;

    if (!patientId) {
      return res.status(400).json({ error: "El id del paciente es requerido" });
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

    return res.status(204).send();
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error.message || "Internal Server Error" });
  }
};

const getMedics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.requesterUserId;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: patientData, error: patientDataError } =
      await supabaseAdmin.rpc("get_patient_id_from_user_id", {
        param_user_id: userId,
      });

    if (patientDataError) {
      const error: CustomError = new Error(
        "Error al obtener id de paciente"
      ) as CustomError;
      error.status = 404;
      throw error;
    }

    const patientId = patientData?.[0]?.patient_id;

    const { data: medicsData, error: medicsDataError } =
      await supabaseAdmin.rpc("get_patient_medics", {
        param_patient_id: patientId,
      });

    if (medicsDataError) {
      const error: CustomError = new Error(
        "Error al obtener médicos"
      ) as CustomError;
      error.status = 404;
      throw error;
    }

    const response = medicsData.map((medic: PatientMedicRow) => {
      return {
        medic_id: medic.out_medic_id,
        name: medic.out_name,
        last_name: medic.out_last_name,
        email: medic.out_email,
        medic_since: medic.out_medic_since,
      };
    });

    return res.status(200).json(response);
  } catch (error: any) {
    console.log(error);
    return res
      .status(500)
      .json({ error: error.message || "Internal Server Error" });
  }
};

const unlinkMedic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.requesterUserId;
    const medicId = req.query.id;

    //@ts-ignore
    const supabaseUrl = env.SUPABASE_URL!;
    //@ts-ignore
    const supabaseSecretKey = env.SUPABASE_SECRET_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    const { data: patientData, error: patientDataError } =
      await supabaseAdmin.rpc("get_patient_id_from_user_id", {
        param_user_id: userId,
      });

    if (patientDataError) {
      const error: CustomError = new Error(
        "Error al obtener id de paciente"
      ) as CustomError;
      error.status = 404;
      throw error;
    }

    const patientId = patientData?.[0]?.patient_id;

    const { data: unlinkMedicData, error: unlinkMedicDataError } =
      await supabaseAdmin.rpc("unlink_medic", {
        param_patient_id: patientId,
        param_medic_id: medicId,
      });

    if (unlinkMedicDataError) {
      const error: CustomError = new Error(
        "Error al desvincular médico"
      ) as CustomError;
      error.status = 404;
      throw error;
    }

    return res.status(200).send();
  } catch (error: any) {
    console.log(error);
    return res
      .status(500)
      .json({ error: error.message || "Internal Server Error" });
  }
};

export { getPatientByEmail, getParams, setParams, getMedics, unlinkMedic };
