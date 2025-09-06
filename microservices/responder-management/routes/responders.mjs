import { Router } from "express";
import {
  getAllResponders,
  getResponderProfile,
  updateResponderStatus,
} from "../controllers/responders/responder-controller.mjs";
import {
  submitReport,
  getMyReports,
  getReportById,
  updateReport,
} from "../controllers/reports/report-controller.mjs";
import { authorization } from "../../../utils/auth/authorization.mjs";

const responders = Router();

// Profile and status routes
responders.get(
  "/profile",
  authorization("responder", "admin"),
  getResponderProfile
);
responders.get("/all", getAllResponders);
responders.put(
  "/update-status",
  authorization("responder"),
  updateResponderStatus
);

// Report routes
responders.post("/reports", authorization("responder"), submitReport);
responders.get("/reports", authorization("responder"), getMyReports);
responders.get(
  "/reports/:reportId",
  authorization("responder", "admin"),
  getReportById
);
responders.put("/reports/:reportId", authorization("responder"), updateReport);

// responders.post('/updateLocation', authorization('responder'), )

export default responders;
