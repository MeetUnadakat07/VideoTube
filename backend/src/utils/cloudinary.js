import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // upload the file on Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        // file has been uploaded successfully
        // console.log("File is uploaded on Cloudinary", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        // remove the locally saved temperory file as the upload operation is failed
        fs.unlinkSync(localFilePath);
        return null;
    }
};

const deleteFromCloudinary = async (imageURL) => {
    try {
        if (!imageURL) {
            return null;
        }

        const parts = imageURL.split("/upload/");

        if (parts.length !== 2) {
            console.log("Invalid Cloudinary URL", imageURL);
            return null;
        }

        let publicId = parts[1];

        // regex for remove the version number if present
        publicId = publicId.replace(/^v\d+\//, "");

        // regex for removing the extension
        publicId = publicId.replace(/\.[^/.]+$/, "");

        const response = await cloudinary.uploader.destroy(publicId);

        console.log("Cloudinary delete response: ", response);
        return response;
    } catch (error) {
        console.log("Cloudinary delete error: ", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
