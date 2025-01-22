import userModel from "../models/userSchema.mjs";


export async function userSignupService(user){
    try {
        const newUser = new userModel(user)
        const savedUser = await newUser.save()
        return savedUser
    } catch (error) {
        console.log(error)
        throw new Error(`An Error occurred while creating your account. Please try again later`)  
    }
}