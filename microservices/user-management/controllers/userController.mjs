import User from '../models/userSchema.mjs'

export const getUser = async (req, res) => {
    try {
        const id = req.params.id
        const userExists = await User.findOne({user_id:id})
        if (!userExists) {
            return res.status(404).json({message: "User not found"})
        }
        res.status(200).json(userExists)
    } catch (error) {
        res.status(500).json({message: `Error: ${error.message}`})
    }
}


export const getUsers = async (req, res) => {
    try {
        const users = await User.find()
        if (users.length === 0) {
            return res.status(404).json({message: "User not found"})
        }
        res.status(200).json(users)
    } catch (error) {
        res.status(500).json({message: `Error: ${error.message}`})
    }
}


export const updateUser = async (req, res) => {
    try {
        const id = req.params.id
        const userExists = await User.findOne({user_id:id})
        if (!userExists) {
            return res.status(404).json({message: "User not found"})
        }
        const updateUser = await User.findAndUpdate({user_id:id}, req.body, {new:true})
        res.status(201).json(updateUser)
    } catch (error) {
        res.status(500).json({message: `Error: ${error.message}`})
    }
}