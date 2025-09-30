import { comparePassword } from "../../../../utils/auth/pass-hash.mjs";
import { generateToken } from "../../../../utils/auth/tokens.mjs";
import { findResponderByBadgeNumber } from "../../services/responder.mjs";


export async function loginController(req,res,next){
    try {
        const {badgeNumber, password} = req.body;
        if(!badgeNumber || !password){
            return res.status(400).send({message: "Email and password are required"});
        }
        const responder = await findResponderByBadgeNumber(badgeNumber);

        if(!responder) return res.status(400).send({message: `Responder with badge Number ${badgeNumber} does not exist`})
        if(!comparePassword(password,responder.password)) return res.status(400).send({message: "Incorrect password"})
        
        const token = generateToken({responder_id: responder.responder_id, badgeNumber: responder.badgeNumber, agency: responder.agency, agency_id: responder.agency_id, name: responder.name, role: responder.role})
        return res.status(200).send({
            token, 
            responderName: responder.name, 
            responder_id: responder.responder_id,
            responder_agency: responder.agency
        })
        
    } catch (error) {
        console.log(error); //will be removed later
        return res.status(500).send({message: error.message})
        
    }
}