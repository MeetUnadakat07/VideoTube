import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist

    const { name, description } = req.body;
    const userId = req.user._id;

    if (!name || !description) {
        throw new APIError(400, "Name and description are required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: userId,
    });

    if (!playlist) {
        throw new APIError(500, "Unable to create the playlist");
    }

    return res
        .status(200)
        .json(new APIResponse(200, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists

    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new APIError(400, "Invalid user id");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                        },
                    },
                ],
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                createdAt: 1,
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" },
                firstVideoThumbnail: { $first: "$videos.thumbnail" },
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                playlists,
                "User playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id

    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new APIError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: { isPublished: true },
                    },
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                        },
                    },
                ],
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
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1,
                videos: 1,
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" },
            },
        },
    ]);

    if (!playlist.length) {
        throw new APIError(404, "Playlist not found");
    }

    // console.log("Playlist from DB", playlist[0]);
    // console.log("Videos from playlist", playlist[0]?.videos);

    return res
        .status(200)
        .json(
            new APIResponse(200, playlist[0], "Playlist fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(userId)) {
        throw new APIError(400, "Invalid user id");
    }

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new APIError(
            403,
            "You are not authorized to add a video to this playlist"
        );
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId },
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new APIError(500, "Unable to add the video in the playlist");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updatedPlaylist,
                "Video successfully added to the playlist"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist

    const { playlistId, videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(userId)) {
        throw new APIError(400, "Invalid user id");
    }

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new APIError(
            403,
            "You are not authorized to remove a video from this playlist"
        );
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId },
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new APIError(500, "Unable to remove video from playlist");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updatedPlaylist,
                "Video successfully removed from the playlist"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist

    const { playlistId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(userId)) {
        throw new APIError(400, "Invalid user id");
    }

    if (!isValidObjectId(playlistId)) {
        throw new APIError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new APIError(
            403,
            "You are not authorized to remove this playlist"
        );
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
        throw new APIError(500, "Unable to remove this playlist");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                deletedPlaylist,
                "The playlist is removed successfully"
            )
        );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist

    const { playlistId } = req.params;
    const { name, description } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(userId)) {
        throw new APIError(400, "Invalid user id");
    }

    if (!isValidObjectId(playlistId)) {
        throw new APIError(400, "Invalid playlist id");
    }

    if (!name && !description) {
        throw new APIError(
            400,
            "Please provide the name or description to update"
        );
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
        throw new APIError(
            403,
            "You are not authorized to update this playlist"
        );
    }

    const updateFields = {};
    if (name) {
        updateFields.name = name;
    }
    if (description) {
        updateFields.description = description;
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: updateFields,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedPlaylist) {
        throw new APIError(500, "Unable to update the playlist");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updatedPlaylist,
                "The playlist is updated successfully"
            )
        );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
