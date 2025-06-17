import { Router } from "express";
import { getAllResponders, getResponderProfile } from "../controllers/responders/responder-controller.mjs";
import { authorization } from "../../../utils/auth/authorization.mjs";


const responders = Router();

responders.get("/profile", authorization("responder","admin"),getResponderProfile)

responders.get('/all',getAllResponders)

// responders.post('/updateLocation')

export default responders