import express from 'express';
import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

const app = express()
configDotenv()
app.use(express.json())


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

const db_connection = mongoose.connection;

//Initialize Grid Bucket
let bucket;

db_connection.once('open',  () => {
    bucket = new GridFSBucket(db_connection.db, { bucketName: 'uploads' });
});

export {bucket}