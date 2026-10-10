import express, { Router } from "express";
import { login, demoLogin } from "../controllers/authController.js";

const router: Router = express.Router();

router.post("/", login);
router.post("/demo", demoLogin);

export default router;
