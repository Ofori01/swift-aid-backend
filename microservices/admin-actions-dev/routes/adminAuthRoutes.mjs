import express from "express";
import {
  adminLogin,
  adminSignup,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
} from "../controllers/auth/admin-auth-controller.mjs";
import { authorization } from "../../../utils/auth/authorization.mjs";

const adminAuthRouter = express.Router();

// Public routes (no authentication required)
adminAuthRouter.post("/login", adminLogin);
adminAuthRouter.post("/signup", adminSignup);

// Protected routes (admin authentication required)
adminAuthRouter.use(authorization("admin"));

adminAuthRouter.get("/profile", getAdminProfile);
adminAuthRouter.put("/profile", updateAdminProfile);
adminAuthRouter.put("/password", changeAdminPassword);

export default adminAuthRouter;
