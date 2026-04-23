import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import isAdmin from "../middleware/isAdmin.js";
import { updateData } from "../controllers/dataController.js";

const router = express.Router();

router.put("/update", verifyToken, isAdmin, updateData);

export default router;
