// require('dotenv').config({path: './env'})

import connectDB from "./db/index.js";
import dotenv from "dotenv";

// (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     } catch (error) {
//         console.error(`Error: ${error}`);
//         throw error;
//     }
// })();

dotenv.config({
    path: "./env",
});

connectDB();
