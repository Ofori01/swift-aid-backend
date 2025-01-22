import { userSignupService } from "../services/user.mjs"

export async function userSignup(req, res, next) {
    try {
        // get and check required fields
        const { name, phone_number, email, password, ghana_card_number, } = req.body
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
        
    } catch (error) {
        
    }
}