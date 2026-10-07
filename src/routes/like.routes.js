import mongoose, { isValidObjectId } from "mongoose";
import Like from "../models/like.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on video
    const { videoId } = req.params;
    const userId = user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    if (!userId) {
        throw new ApiError(400, "User not found");
    }

    const like = await Like.findOne({
        video: videoId,
        likedBy: userId,
    });

    let action;

    if (like) {
        await Like.findByIdAndDelete(like._id);
        action = "disliked";
    } else {
        await Like.create({
            video: videoId,
            likedBy: userId,
        });
        action = "liked";
    }

    const likeCount = await Like.countDocuments({ video: videoId });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { likeCount }, `Video ${action} successfully`)
        );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }

    if (!userId) {
        throw new ApiError(400, "User not found");
    }

    const like = await Like.findOne({
        comment: commentId,
        likedBy: userId,
    });

    let action;

    if (like) {
        await Like.findByIdAndDelete(like._id);
        action = "unliked";
    } else {
        await Like.create({
            comment: commentId,
            liked: true,
        });
        action = "liked";
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, `Comment ${action} successfully`));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on tweet
    const { tweetId } = req.params;
    const userId = user._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    if (!userId) {
        throw new ApiError(200, "User not found");
    }

    const like = Like.findOne({
        tweet: tweetId,
        likedBy: userId,
    });

    let action;

    if (like) {
        await Like.findByIdAndDelete(like._id);
        action = "unliked";
    } else {
        await Like.create({
            tweet: tweetId,
            likedBy: userId,
        });
        action = "liked";
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, `Tweet ${action} successfully`));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = user._id;

    if (!userId) {
        throw new ApiError(400, "User not found");
    }

    const likedVideos = await Like.find({
        likedBy: userId,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "Liked videos fetched successfully"
            )
        );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
