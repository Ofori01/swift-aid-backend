import responderModel from "../../models/responder-schema.mjs";
import { findResponderByBadgeNumber, findResponderByEmail } from "../../services/responder.mjs";

export async function getResponderProfile(req, res, next) {
  try {
    const responderInfo = req.user; //from the auth middleware which should add the user to the request object
    const responder = await findResponderByBadgeNumber(responderInfo.badgeNumber);
    if (!responder)
      return res.status(404).send({ message: "Responder not found" });
    return res.status(200).send(responder);
  } catch (error) {
    console.log(error); //will be removed later
    return res.status(500).send({ message: error.message });
  }
}

export async function getAllResponders(req, res, next) {
  try {
    const responders = await responderModel.find();
    res.send(responders);
  } catch (error) {}
}

export async function updateResponderStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).send({ message: "Invalid request" });
    }
    const updated = await responderModel.findOneAndUpdate(
      { responder_id: req.user.responder_id },
      { status },
      { new: true }
    );
    if (!updated) {
      return res
        .status(500)
        .send({
          message:
            "Something went wrong when trying to update status. Please try again later",
        });
    }
    return res
      .status(200)
      .send({ message: "Status changed successfully", responder: updated });
  } catch (error) {
    console.log(error); //will be removed later
    return res.status(500).send({ message: error.message });
  }
}
