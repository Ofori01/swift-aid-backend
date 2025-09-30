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

export async function findUserByPhone(phone_number){
    try {
        const user = userModel.findOne({phone_number})
        if(!user){
            throw new Error("User not found")
        }
        return user
    } catch (error) {
        console.log(error)
        if (error.message === "User not found") {
            throw error;
          } else {
            throw new Error("An Error occurred while signing you in. Please try again later");
          }  
      }
}