import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { APIError } from "../utils/apiError.js";
import { APIResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: Toggle subscription
    const { channelId } = req.params;
    const subscriberId = req.user?._id;

    // validating the channel id
    if (!isValidObjectId(channelId)) {
        throw new APIError(400, "Invalid channelId");
    }

    // prevent subscribing to own channel
    if (channelId.toString() === subscriberId.toString()) {
        throw new APIError(
            400,
            "You cannot subscribe / unsubscribe to your own channel"
        );
    }

    // checl weather the channe; exists
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new APIError(404, "Channel not found");
    }

    // check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId,
    });

    // toggle
    let action;

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);
        action = "Unsubscribed";
    } else {
        await Subscription.create({
            subscriber: subscriberId,
            channel: channelId,
        });
        action = "Subscribed";
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                { subscribed: !existingSubscription },
                `${action} successfully`
            )
        );
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // TODO: return the subscriber list of a channel
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new APIError(400, "Invalid channelId");
    }

    const channelSubscriber = await Subscription.find({
        channel: channelId,
    }).populate("subscriber", "username avatar");

    if (channelSubscriber.length === 0) {
        return res
            .status(200)
            .json(
                new APIResponse(
                    200,
                    [],
                    "No subscribers found"
                )
            );
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                channelSubscriber,
                "ChannelSubscriber fetched successfully"
            )
        );
});

const getSubscribedChannel = asyncHandler(async (req, res) => {
    // TODO: to return the channel list to which a user has subscribed
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new APIError(400, "Invalid subscriber id");
    }

    const subscribedChannel = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            createdAt: 1,
                            _id: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$channelDetails",
        },
        {
            $project: {
                _id: 0,
                channel: "$channelDetails",
                subscribed_at: "$createdAt",
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                subscribedChannel,
                "Subscriber details fetched successfully"
            )
        );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannel };
