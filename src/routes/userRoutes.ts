import express, { Router } from "express";
import { loadDose } from "../controllers/userController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router: Router = express.Router();

router.post("/dose", requireAuth, loadDose);

export default router;
