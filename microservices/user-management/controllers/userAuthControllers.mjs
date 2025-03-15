import { userSignupService } from "../services/user.mjs"
import { comparePassword, generatePasswordHash } from "../../../utils/auth/pass-hash.mjs"
import {generateToken} from "../../../utils/auth/tokens.mjs"

export async function userSignup(req, res, next) {
    try {
        // get and check required fields
        let { name, phone_number, email, password, ghana_card_number, } = req.body
        if (!name || !phone_number || !email || !password || !ghana_card_number) {
            return res.status(400).send({
                message: "Please fill all fields"
            })
        }
        const ghana_card_image_back = req.files.ghana_card_image_back[0].buffer
        const ghana_card_image_front = req.files.ghana_card_image_front[0].buffer
        if(!ghana_card_image_back || !ghana_card_image_front){
            return res.status(400).send({
                message: "Please upload front and back images of a valid Ghana card"
            })
        }
        // create user
        password = generatePasswordHash(password)
        const newUser = await userSignupService({name, phone_number, email, password, ghana_card_number, ghana_card_image_back, ghana_card_image_front})
        return res.status(201).send({
            message: "User created successfully",
            user: newUser
        })
    } catch (error) {
        console.log(error)
        res.status(500).send({
            message: `An Error occurred while creating your account. Please try again later` 
        })
        
    }
}

export async function userLogin(req,res,next){
    try {
        const {phone_number, password} = req.body
        if(!phone_number || !password){
            return res.status(400).send({
                message: "Please fill all fields"
            })
        }
        const user = await findUserByPhone(phone_number)
        if(!comparePassword(password,user.password)){
            return res.status(401).send({
                message: "Invalid phone number or password"
            })
        }
        //generate token
        const token = generateToken({user_id: user.user_id, phone_number: user.phone_number})
        return res.status(200).send({
            message: "Login successful",
            token,
            user: {
                name: user.name,
                email: user.email,
                phone_number: user.phone_number
            }
        })
    } catch (error) {
        return res.status(500).send({
            message: error.message
        })
        
    }
}