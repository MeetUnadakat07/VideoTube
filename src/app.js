import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

// Writing the middlewares in express

// used to parse the json requests
app.use(express.json({ limit: "16kb" }));

// used to parse the data that has been sent using URL-encoded form (HTML forms)
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Used to serve the static files (public folder in this)
app.use(express.static("public"));

// Parse cookies sent by the browser and make them accessible through req.cookies
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";

// routes declaration
app.use("/api/v1/users", userRouter);

export default app;
