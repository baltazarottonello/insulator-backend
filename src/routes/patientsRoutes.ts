import express, { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getPatientByEmail,
  getAllPatients,
  getParams,
  setParams,
} from "../controllers/patientsController.js";

const router: Router = express.Router();

//TODO: this route should be /search
router.get("/", requireAuth, getPatientByEmail);
//TODO: this route should be /
router.get("/all", requireAuth, getAllPatients);
router.get("/params", requireAuth, getParams);
//TODO: this route should be in /medic routes -> /medic/patient/params
router.post("/params", requireAuth, setParams);

export default router;
