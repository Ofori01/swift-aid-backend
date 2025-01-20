import { comparePassword } from "../../../../utils/auth/pass-hash.mjs";
import { generateToken } from "../../../../utils/auth/tokens.mjs";


export async function loginController(req,res,next){
    try {
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).send({message: "Email and password are required"});
        }
        const responder = await findResponderByEmail(email);

        if(!responder) return res.status(400).send({message: "Email does not exist"})
        if(!comparePassword(password,responder.password)) return res.status(400).send({message: "Incorrect password"})
        
        const token = generateToken(responder)
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