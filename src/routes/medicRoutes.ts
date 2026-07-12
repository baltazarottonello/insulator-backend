import express, { Router } from "express";
import {
  checkUserAvailability,
  getPatients,
  assignPatient,
} from "../controllers/medicController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router: Router = express.Router();

router.get("/patients", requireAuth, getPatients);
router.get("/user/availability", requireAuth, checkUserAvailability);
router.post("/user/assign", requireAuth, assignPatient);

export default router;
