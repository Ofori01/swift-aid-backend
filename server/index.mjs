import express from 'express';
import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';

const app = express()
configDotenv()

const PORT = process.env.ENVIRONMENT === 'production' ? process.env.PORT : process.env.LOCAL_PORT
app.listen(PORT, ()=> {
    console.log("Server Started")
})

mongoose.connect(process.env.DATABASE_URL).then(
    ()=>{
        console.log('Database connected Successfully')
    }
).catch(
    (error)=>{
        console.error("Error connecting database\n",error)
    }
)