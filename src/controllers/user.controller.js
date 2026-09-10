import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";

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
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

    const createdUser = await user
        .findById(user._id)
        .select("-password -refreshToken");

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

export { registerUser };
