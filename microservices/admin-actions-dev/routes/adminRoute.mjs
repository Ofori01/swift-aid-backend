import express from "express";
import { 
    getAllResponders, 
    getResponderById,
    getAgency,  
    deleteResponder, 
    addResponder 
} from "../controllers/responders/responderControllers.mjs";
import { addAdmin, createAgency } from "../controllers/admin/admin-actions-controller.mjs";

const adminRouter = express.Router();

// View all responders under the admin’s agency
adminRouter.get("/responders", getAllResponders);

// Get details of a single responder in the admin's agency
adminRouter.get("/responders/:id", getResponderById);

//Get the agency of an admin
//! consider renaming this route to /admin/agency
adminRouter.get("/agency", getAgency);

// Add a new responder
adminRouter.post("/add/responder", addResponder);

// Remove a responder
adminRouter.delete("/delete/responders/:id", deleteResponder);

//create an agency
adminRouter.post('/agency', createAgency)

//add admin
adminRouter.post('/add', addAdmin)

export default adminRouter;