import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video

    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid comment id");
    }

    const pageNo = parseInt(page, 10);
    const limitNo = parseInt(limit, 10);

    const comments = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
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
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                owner: 1,
            },
        },
    ]);

    const options = {
        page: pageNo,
        limit: limitNo,
        customLabels: {
            docs: "comments",
        },
    };

    const result = await Comment.aggregatePaginate(comments, options);

    return res
        .status(200)
        .json(
            new APIResponse(200, result, "Video comments fetched successfully")
        );
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid videoId");
    }

    if (!content) {
        throw new APIError(400, "Comment content is required");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId,
    });

    if (!comment) {
        throw new APIError(500, "Unable to create the comment");
    }

    return res
        .status(200)
        .json(new APIResponse(200, comment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
        throw new APIError(400, "Invalid comment id");
    }

    if (!content) {
        throw new APIError(400, "Content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new APIError(400, "Comment not found");
    }

    if (comment.owner.toString() !== userId.toString()) {
        throw new APIError(
            403,
            "You are not authorized to update this comment"
        );
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: { content: content },
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedComment) {
        throw new APIError(500, "Unable to update the comment");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, updatedComment, "Comment updated successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
        throw new APIError(400, "Invalid comment id");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new APIError(400, "Comment not found");
    }

    if (comment.owner.toString() !== userId.toString()) {
        throw new APIError(
            403,
            "You are not authorized to delete this comment"
        );
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new APIError(500, "Unable to delete the comment");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, deletedComment, "Comment deleted successfully")
        );
});

export { getVideoComments, addComment, updateComment, deleteComment };
