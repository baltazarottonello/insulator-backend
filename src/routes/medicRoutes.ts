import express, { Router } from "express";
import {
  checkUserAvailability,
  getPatients,
  assignPatient,
  getPatientParamsHistory,
} from "../controllers/medicController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router: Router = express.Router();

router.get("/patients", requireAuth, getPatients);
router.get("/patient/params-history", requireAuth, getPatientParamsHistory);
router.get("/user/availability", requireAuth, checkUserAvailability);
router.post("/user/assign", requireAuth, assignPatient);

export default router;
