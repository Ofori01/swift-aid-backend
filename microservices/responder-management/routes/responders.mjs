import { Router } from "express";
import { getAllResponders, getResponderProfile, updateResponderStatus } from "../controllers/responders/responder-controller.mjs";
import { authorization } from "../../../utils/auth/authorization.mjs";


const responders = Router();

responders.get("/profile", authorization("responder","admin"),getResponderProfile)

responders.get('/all',getAllResponders)

responders.put('/update-status', authorization('responder'),updateResponderStatus)

// responders.post('/updateLocation', authorization('responder'), )

export default responders