import express from "express";
import { 
    getAllResponders, 
    getResponderById,
    getAgency,  
    deleteResponder, 
    addResponder 
} from "../controllers/adminControllers.mjs";

const adminRouter = express.Router();

// View all responders under the admin’s agency
router.get("/responders", getAllResponders);

// Get details of a single responder in the admin's agency
router.get("/responders/:id", getResponderById);

//Get the agency of an admin
router.get("/agency", getAgency);

// Add a new responder
router.post("/responders", addResponder);

// Remove a responder
router.delete("/responders/:id", deleteResponder);

export default adminRouter;