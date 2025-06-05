import { generatePasswordHash } from "../../../../utils/auth/pass-hash.mjs"
import adminModel from "../../models/adminSchema.mjs"
import agencyModel from "../../models/agencies-schema.mjs"


export async function createAgency(req,res,next){

    try {
        const {agency_name, branch, agency_type, location, admin_id }= req.body

        if(!agency_name || !branch, !agency_type, !location || !admin_id){
            return res.status(400).send({message: "Please fill all fields"})
        }

        const newAgency = await agencyModel.create({
            name: agency_name,
            location,
            branch,
            agency_type,
            admin_id
        })
        res.status(200).send({message: "Agency created successfully", data: newAgency})

    } catch (error) {
        console.log('Creating agency error',error)
        res.status(500).send({message: "Something went wrong when adding agency"})
        
    }
}

export async function addAdmin(req,res,next){

    try {
        const {email, password, phone, name,badgeNumber} = req.body

        if(!email || !password || !phone || !name || !badgeNumber){
            return res.status(400).send({message: "Please fill all fields"})
        }

        const hashedPassword = generatePasswordHash(password)

        const newAdmin = await adminModel.create({
            email,
            password: hashedPassword,
            name,
            phone,
            badgeNumber
        })
        res.status(201).send({message: "admin created successfully", data: newAdmin})
        
    } catch (error) {
        console.log("Creating admin error", error)
        res.status(500).send({message: "An error occurred while creating admin"})
        
    }
}