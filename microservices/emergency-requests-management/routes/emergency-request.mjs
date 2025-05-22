import { Router } from "express";
import multer from "multer";
import {singleImageHandler } from "../../../utils/images/imageHandler.mjs";
import { createEmergencyRequest } from "../controllers/create-emergency-request.mjs";
import { getAiRecommendations } from "../controllers/get-recommendations.mjs";


//memory storage for multer
//? might introduce memory leaks. We might have to replace with disk storage
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const emergencyRequestRouter = Router();



emergencyRequestRouter.post('/create', upload.single('image'), singleImageHandler, createEmergencyRequest,getAiRecommendations)






export default emergencyRequestRouter;