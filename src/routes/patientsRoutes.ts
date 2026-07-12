import express, { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getPatientByEmail,
  getAllPatients,
  getParams,
  setParams,
} from "../controllers/patientsController.js";

const router: Router = express.Router();

//*DEPRECATED*//
router.get("/", requireAuth, getPatientByEmail);

router.get("/params", requireAuth, getParams);
//TODO: this route should be in /medic routes -> /medic/patient/all
router.get("/all", requireAuth, getAllPatients);
//TODO: this route should be in /medic routes -> /medic/patient/params
router.post("/params", requireAuth, setParams);

export default router;
