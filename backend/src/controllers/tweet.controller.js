import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const userId = req.user._id;
    const { content } = req.body;

    if (!content) {
        throw new APIError(401, "There is no content to post");
    }

    const tweet = await Tweet.create({
        content: content,
        owner: userId,
    });

    if (!tweet) {
        throw new APIError(400, "Tweet is not created.");
    }

    return res
        .status(200)
        .json(new APIResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;

    if (!userId) {
        throw new APIError(401, "User is not authenticated");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: {
                    $in: [
                        new mongoose.Types.ObjectId(req.user._id),
                        "$likes.likedBy",
                    ],
                },
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);

    if (!tweets || tweets.length === 0) {
        return res
            .status(200)
            .json(new APIResponse(200, [], "No tweets found for this user"));
    }

    return res
        .status(200)
        .json(new APIResponse(200, tweets, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new APIError(400, "Tweet id is required");
    }

    if (!content) {
        throw new APIError(400, "Tweet content is required");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new APIError(404, "Tweet is missing");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(403, "You are not authorized to update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            content: content,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedTweet) {
        throw new APIError(500, "Unable to update the tweet");
    }

    return res
        .status(200)
        .json(new APIResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new APIError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new APIError(404, "Unable to find Tweet");
    }

    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(403, "You are not authorized to delete this tweet");
    }

    const deleteTweetDoc = await Tweet.findByIdAndDelete(tweetId);

    if (!deleteTweetDoc) {
        throw new APIError(500, "Unable to delete the tweet");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                deleteTweetDoc,
                "Tweet has been deleted successfully"
            )
        );
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
