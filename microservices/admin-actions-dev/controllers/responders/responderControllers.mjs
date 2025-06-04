import responderModel from "../../../responder-management/models/responder-schema.mjs";
import { comparePassword, generatePasswordHash } from "../../../../utils/auth/pass-hash.mjs"
import agencyModel from "../../models/agencies-schema.mjs";


export const getAllResponders = async (req, res) => {
    try {
        const agencyId = req.user.agency_id;
        const responders = await responderModel.find({ agency_id: agencyId });
        res.status(200).json(responders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching responders", error });
    }
};


export const getResponderById = async (req, res) => {
    try {
        const responder = await responderModel.findById({responder_id: req.params.id});
        if (!responder) {
            return res.status(404).json({ message: "Responder not found" });
        }
        res.status(200).json(responder);
    } catch (error) {
        res.status(500).json({ message: "Error fetching responder", error });
    }
};


export const getAgency = async (req, res) => {
    try {
        const adminId = req.user.user_id;
        const agency = await agencyModel.findOne({ admin_id: adminId });

        if (!agency) {
            return res.status(404).json({ message: "Agency not found" });
        }
        
        res.status(200).json(agency);
    } catch (error) {
        res.status(500).json({ message: "Error fetching agency", error });
    }
};


export const addResponder = async (req, res) => {
    try {
        let { email, password, phone, name, badgeNumber, agency, agency_id, status, current_location } = req.body;

        if (!email || !password || !phone || !name || !badgeNumber || !agency || !agency_id || !status || !current_location) {
            return res.status(400).send({
                message: "Please fill all fields"
            })
        }

        const existingResponder = await responderModel.findOne({ email });
        if (existingResponder) {
            return res.status(400).json({ message: "Responder already exists" });
        }

        password = generatePasswordHash(password)

        const newResponder = new responderModel({
            email,
            password, 
            phone,
            name,
            badgeNumber,
            agency,
            agency_id,
            status,
            current_location
        });

        const savedResponder = await newResponder.save();
        res.status(201).json({
            message: "Responder added successfully",
            responder: savedResponder
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: `Error adding responder. Please try again later`, error });
    }
};


export const deleteResponder = async (req, res) => {
    try {
        const responder = await responderModel.findByIdAndDelete({responder_id: req.params.id});
        if (!responder) {
            return res.status(404).json({ message: "Responder not found" });
        }
        res.status(200).json({ message: "Responder removed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error removing responder", error });
    }
};
