import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log("Token generation error: ", error);
        throw new APIError(
            500,
            "Something went wrong while generating Access and Refresh tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username, email
    // check for images
    // check if avatar is present
    // upload them to cloudinary, avatar
    // create user objest - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const { fullName, email, username, password } = req.body;
    console.log("email: ", email);

    // if(fullName === "") {
    //     throw new APIError(400, "Fullname is required")
    // }

    // we will need to write the if statements for all the fields so we try to use another approach

    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    )
        throw new APIError(400, "All fields are required");

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    console.log("Username:", username);
    console.log("Email:", email);
    console.log("Existing user:", existingUser);

    if (existingUser) {
        throw new APIError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // adding a check on weather the user has given coverImage or not
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new APIError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new APIError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new APIError(
            500,
            "Something went wrong while regstering the user"
        );
    }

    return res
        .status(201)
        .json(
            new APIResponse(200, createdUser, "User registered successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // req -> body  data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new APIError(400, "Username or email is required");
    }

    if (!password) {
        throw new APIError(400, "Password is required");
    }

    // in User model when we try to find either email or username we can use this syntax
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new APIError(404, "User does not exist");
    }

    const isPAsswordValid = await user.isPasswordCorrect(password);

    if (!isPAsswordValid) {
        throw new APIError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    );

    // by using this we set that cookies can only be modified by the server and the frontend cannot modify it (view only access)
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new APIResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new APIResponse(200, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new APIError(401, "Unauthorized access");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new APIError(401, "Invalide Refresh Token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new APIError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new APIResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        console.log("Access token regeneration error ", error);
        throw new APIError(401, error?.message || "Invalid Refresh Token");
    }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
