import { findResponderByEmail } from "../../services/responder.mjs";


export async function getResponderProfile(req,res,next){
    try {
        const responderInfo = req.user; //from the auth middleware which should add the user to the request object 
        
        const responder = await findResponderByEmail(responderInfo.email);
        if (!responder) return res.status(404).send({message: "Responder not found"});
        return res.status(200).send(responder);

    } catch (error) {
        console.log(error); //will be removed later
        return res.status(500).send({message: error.message})
        
    }
}