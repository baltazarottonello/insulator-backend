import express, { Router } from "express";
import {
  loadDose,
  updateProfileData,
  deleteUserData,
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router: Router = express.Router();

router.post("/dose", requireAuth, loadDose);
router.put("/profile", requireAuth, updateProfileData);
router.delete("/delete", requireAuth, deleteUserData);

export default router;
