import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];

    pipeline.push({ $match: { isPublished: true } });

    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                ],
            },
        });
    }

    if (userId && isValidObjectId(userId)) {
        pipeline.push({
            $match: { owner: new mongoose.Types.ObjectId(userId) },
        });
    }

    const sortTypeValue = sortType === "asc" ? 1 : -1;
    const sortByField = sortBy || "createdAt";

    pipeline.push({
        $sort: {
            [sortByField]: sortTypeValue,
        },
    });

    pipeline.push({
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
    });

    pipeline.push({
        $addFields: {
            owner: { $first: "$owner" },
        },
    });

    pipeline.push({
        $project: {
            videoFile: 1,
            thumbnail: 1,
            title: 1,
            description: 1,
            views: 1,
            duration: 1,
            createdAt: 1,
            owner: 1,
        },
    });

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        customLabels: {
            docs: "videos",
        },
    };

    const result = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new APIResponse(200, result, "Video fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const { title, description } = req.body;

    if (!title || !description) {
        throw new APIError(401, "Title and description are required");
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new APIError(400, "Video file and thumbnail are required");
    }

    const video = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!video || !thumbnail) {
        throw new APIError(
            400,
            "Some error occured while uploading the video and thumbnail on cloudinary"
        );
    }

    const newVideo = await Video.create({
        title,
        description,
        videoFile: video.secure_url,
        thumbnail: thumbnail.secure_url,
        duration: video.duration,
        owner: req.user._id,
    });

    if (!newVideo) {
        throw new APIError(402, "Unable to create new video at this moment");
    }

    return res
        .status(200)
        .json(new APIResponse(200, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id");
    }

    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId,
        },
    });

    const video = await video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true,
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
                            _id: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "owner",
                },
            },
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
                createdAt: 1,
                owner: 1,
                isPublished: 1,
            },
        },
    ]);

    if (!video.length) {
        throw new APIError(404, "Video not found or is not published");
    }

    return res
        .status(200)
        .json(new APIResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params;

    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!title || !description || !thumbnailLocalPath) {
        throw new APIError(
            403,
            "Atleast one field (title, description, thumbnail) is required for update"
        );
    }

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(405, "Video is missing");
    }

    if (video.owner.tostring() !== req.user?._id.tostring()) {
        throw new APIError(403, "You are not allowed to update this video");
    }

    const updatedFields = {};

    if (title) {
        updatedFields.title = title;
    }

    if (description) {
        updatedFields.description = description;
    }

    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!thumbnail || !thumbnail.url) {
            throw new APIError(400, "Error while uploading on cloudinary");
        }

        updatedFields.thumbnail = thumbnail.url;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updatedFields,
        },
        {
            new: true,
        }
    );

    if (!updatedVideo) {
        throw new APIError(500, "Error while uploading the video");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, updatedVideo, "Video is updated successfully")
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(404, "Video not found");
    }

    if (video.owner.tostring() !== req.user?._id.tostring()) {
        throw new APIError(401, "You are not allowed to delete this video");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if (!deletedVideo) {
        throw new APIError(403, "Unable to delete this video at this moment");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, deletedVideo, "Video is deleted successfully")
        );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(404, "Video not found");
    }

    if (video.owner.tostring() !== req.user?._id.tostring()) {
        throw new APIError(403, "You are not authorized to update this video");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { isPublished: !video.isPublished },
        { new: true }
    );

    if (!updatedVideo) {
        throw new APIError(500, "Error while toggling publish status");
    }

    res.status(200).json(
        new APIResponse(
            200,
            updatedVideo,
            "Video publish status toggled successfully"
        )
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
