import { Router } from "express";
import multer from "multer";
import { singleImageHandler } from "../../../utils/images/imageHandler.mjs";
import { createEmergencyRequest } from "../controllers/create-emergency-request.mjs";
import { getAiRecommendations } from "../controllers/get-recommendations.mjs";
import { getDistanceMatrix } from "../../distance-matrix/get-matrix.mjs";
import { saveEmergencyInfo } from "../controllers/save-emergency-info.mjs";
import { imageDownloader } from "../../../utils/images/imageDownloader.mjs";
import { authorization } from "../../../utils/auth/authorization.mjs";

//memory storage for multer
//? might introduce memory leaks. We might have to replace with disk storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const emergencyRequestRouter = Router();

emergencyRequestRouter.post(
  "/create",
  authorization("user"),
  upload.single("image"),
  singleImageHandler,
  createEmergencyRequest,
  getAiRecommendations,
  getDistanceMatrix,
  saveEmergencyInfo
);
emergencyRequestRouter.get("/image/:id", imageDownloader);

export default emergencyRequestRouter;
