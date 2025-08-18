import express from "express";
import {
  getAllResponders,
  getResponderById,
  getAgency,
  deleteResponder,
  addResponder,
} from "../controllers/responders/responderControllers.mjs";
import {
  addAdmin,
  createAgency,
} from "../controllers/admin/admin-actions-controller.mjs";
import { getDashboardInfo } from "../controllers/dashboard/admin-dashboard-controller.mjs";
import {
  getPerformanceAnalytics,
  getResponseTimeTrends,
  getResponderUtilization,
} from "../controllers/analytics/admin-analytics-controller.mjs";
import {
  getAgencyEmergencies,
  getEmergencyDetails,
  updateEmergencyStatus,
  assignResponders,
  getOngoingEmergencies,
} from "../controllers/emergency/admin-emergency-controller.mjs";
import {
  generateAgencyReport,
  getEfficiencyReport,
  getResponderPerformanceReport,
  getEmergencyTypesReport,
} from "../controllers/reports/admin-reports-controller.mjs";
import { authorization } from "../../../utils/auth/authorization.mjs";

const adminRouter = express.Router();

// Apply admin authorization to all routes
adminRouter.use(authorization("admin"));

// Dashboard routes
adminRouter.get("/dashboard", getDashboardInfo);

// Analytics routes
adminRouter.get("/analytics", getPerformanceAnalytics);
adminRouter.get("/analytics/response-times", getResponseTimeTrends);
adminRouter.get("/analytics/responder-utilization", getResponderUtilization);

// Reports routes
adminRouter.get("/reports/agency", generateAgencyReport);
adminRouter.get("/reports/efficiency", getEfficiencyReport);
adminRouter.get(
  "/reports/responder-performance",
  getResponderPerformanceReport
);
adminRouter.get("/reports/emergency-types", getEmergencyTypesReport);

// Emergency management routes
adminRouter.get("/emergencies", getAgencyEmergencies);
adminRouter.get("/emergencies/ongoing", getOngoingEmergencies);
adminRouter.get("/emergencies/:emergencyId", getEmergencyDetails);
adminRouter.put("/emergencies/:emergencyId/status", updateEmergencyStatus);
adminRouter.put("/emergencies/:emergencyId/assign", assignResponders);

// Responder management routes
adminRouter.get("/responders", getAllResponders);
adminRouter.get("/responders/:id", getResponderById);
adminRouter.post("/responders", addResponder);
adminRouter.delete("/responders/:id", deleteResponder);

// Agency management routes
adminRouter.get("/agency", getAgency);
adminRouter.post("/agency", createAgency);

// Admin management routes
adminRouter.post("/add", addAdmin);

export default adminRouter;
