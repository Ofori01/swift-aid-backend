import { Router } from "express";
import { getResponderProfile } from "../controllers/responders/responder-controller.mjs";


const responders = Router();

responders.get("/profile", getResponderProfile)

responders.post('')