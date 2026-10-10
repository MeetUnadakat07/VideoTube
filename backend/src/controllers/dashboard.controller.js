import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const channelId = req.user._id;

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 },
                videoIds: { $push: "$_id" },
            },
        },
    ]);

    const stats = videoStats[0] || {
        totalViews: 0,
        totalVideos: 0,
        videoIds: [],
    };

    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId,
    });

    const totalLikes = stats.videoIds.length
        ? await Like.countDocuments({
              video: { $in: stats.videoIds },
          })
        : 0;

    const channelStats = {
        totalSubscribers,
        totalVideos: stats.totalVideos,
        totalViews: stats.totalViews,
        totalLikes,
    };

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                channelStats,
                "Channel stats fetched successfully"
            )
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const channelId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    if (!channelId) {
        throw new APIError(401, "Channel id not found. User not authenticated");
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
            },
        },
    ];

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: pageNumber,
        limit: limitNumber,
        customLabels: {
            docs: "videos",
        },
    };

    const result = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(
            new APIResponse(200, result, "Channel videos fetched successfully")
        );
});

export { getChannelStats, getChannelVideos };
