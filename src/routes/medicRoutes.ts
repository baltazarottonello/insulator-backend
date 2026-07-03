import express, { Router } from "express";
import { getPatients } from "../controllers/medicController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router: Router = express.Router();

router.get("/patients", requireAuth, getPatients);

export default router;
