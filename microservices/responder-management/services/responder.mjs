import responderModel from "../models/responder-schema.mjs";


export async function findResponderByEmail(email){
    try {
        const responder = await responderModel.findOne({email})
        return responder;
    }catch(error){
        console.log(error);
        throw new Error("Error finding responder by email");
    }
}