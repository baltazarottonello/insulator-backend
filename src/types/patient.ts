export type PatientParamsHistoryRow = {
  out_sensitivity: number;
  out_ratio: number;
  out_target_glucose: number;
  out_created_at: string;
  out_is_active: boolean;
};

export type PatientDoseHistoryRow = {
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

export type PatientMedicRow = {
  out_medic_id: string;
  out_name: string;
  out_last_name: string;
  out_email: string;
  out_medic_since: string;
};
