import responderModel from "../../../responder-management/models/responder-schema.mjs";
import {
  comparePassword,
  generatePasswordHash,
} from "../../../../utils/auth/pass-hash.mjs";
import agencyModel from "../../models/agencies-schema.mjs";

export const getAllResponders = async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user.user_id;

    // First find the agency for this admin
    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const agencyId = agency.agency_id;
    const { status, name, badgeNumber } = req.query;
    const query = { agency_id: agencyId };
    if (status) query.status = status;
    if (name) query.name = { $regex: name, $options: "i" };
    if (badgeNumber) query.badgeNumber = badgeNumber;

    const responders = await responderModel
      .find(query)
      .select("name email phone badgeNumber status current_location");
    res.status(200).json(responders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching responders", error });
  }
};

export const getResponderById = async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user.user_id;

    // First find the agency for this admin
    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const agencyId = agency.agency_id;
    const responder = await responderModel
      .findOne({ _id: req.params.id, agency_id: agencyId })
      .select("name email phone badgeNumber status current_location");
    if (!responder) {
      return res
        .status(404)
        .json({ message: "Responder not found or not in your agency" });
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
    let {
      email,
      password,
      phone,
      name,
      badgeNumber,
      agency,
      agency_id,
      status,
      current_location,
    } = req.body;

    if (
      !email ||
      !password ||
      !phone ||
      !name ||
      !badgeNumber ||
      !agency ||
      !agency_id ||
      !status ||
      !current_location
    ) {
      return res.status(400).send({
        message: "Please fill all fields",
      });
    }

    const existingResponder = await responderModel.findOne({ email });
    if (existingResponder) {
      return res.status(400).json({ message: "Responder already exists" });
    }

    password = generatePasswordHash(password);

    const newResponder = new responderModel({
      email,
      password,
      phone,
      name,
      badgeNumber,
      agency,
      agency_id,
      status,
      current_location,
    });

    const savedResponder = await newResponder.save();
    res.status(201).json({
      message: "Responder added successfully",
      responder: savedResponder,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: `Error adding responder. Please try again later`,
      error,
    });
  }
};

export const deleteResponder = async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user.user_id;

    // First find the agency for this admin
    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const agencyId = agency.agency_id;
    const responder = await responderModel.findOneAndDelete({
      _id: req.params.id,
      agency_id: agencyId,
    });
    if (!responder) {
      return res
        .status(404)
        .json({ message: "Responder not found or not in your agency" });
    }
    res.status(200).json({ message: "Responder removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error removing responder", error });
  }
};
export const updateResponder = async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user.user_id;

    // First find the agency for this admin
    const agency = await agencyModel.findOne({ admin_id: adminId });
    if (!agency) {
      return res.status(404).json({ message: "Admin agency not found" });
    }

    const agencyId = agency.agency_id;
    const { id } = req.params;
    const updateFields = req.body;
    // Prevent changing agency_id
    delete updateFields.agency_id;
    const responder = await responderModel
      .findOneAndUpdate(
        { _id: id, agency_id: agencyId },
        { $set: updateFields },
        { new: true }
      )
      .select("name email phone badgeNumber status current_location");
    if (!responder) {
      return res
        .status(404)
        .json({ message: "Responder not found or not in your agency" });
    }
    res
      .status(200)
      .json({ message: "Responder updated successfully", responder });
  } catch (error) {
    res.status(500).json({ message: "Error updating responder", error });
  }
};
