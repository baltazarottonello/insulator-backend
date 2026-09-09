import express, { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getPatientByEmail,
  getParams,
  setParams,
  getMedics,
  unlinkMedic,
} from "../controllers/patientsController.js";

const router: Router = express.Router();

//*DEPRECATED*// --> Borrar cuando la app este en Play Store, para asegurarnos que todos los usuarios tienen la misma version.
router.get("/", requireAuth, getPatientByEmail);

router.get("/params", requireAuth, getParams);
//TODO: this route should be in /medic routes -> /medic/patient/params
router.post("/params", requireAuth, setParams);
router.get("/medics", requireAuth, getMedics);
router.put("/medics/unlink", requireAuth, unlinkMedic);

export default router;
