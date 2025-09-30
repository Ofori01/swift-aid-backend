import { Router } from "express";
import { loginController } from "../controllers/auth/login-controller.mjs";


const responderAuth = Router();

responderAuth.post("/login", loginController);

export default responderAuth