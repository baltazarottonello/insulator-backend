import express, { Router } from "express";
import { login } from "../controllers/authController.js";

const router: Router = express.Router();

router.post("/", login);

export default router;
