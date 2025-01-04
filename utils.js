const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

// converts string id to mongoose id
function convertToMongooseObjectID(id) {
    return new mongoose.Types.ObjectId(id);
}

// converts image file to base64 data url
function converImageToBase64Data(imageFile) {
    const encoding = "base64";
    const mimetype = imageFile.mimetype;

    const imageBase64String = imageFile.buffer.toString(encoding);
    const imageBase64Uri =
        "data:" + mimetype + ";" + encoding + "," + imageBase64String;
    return imageBase64Uri;
}

// cloudinary helpers
// CLOUDINARY CONFIG
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    analytics: false,
});

// Uploads an image file to cloudinary
const uploadImage = async (imageBase64, imageOptions) => {
    const { public_id_prefix, display_name, asset_folder, allowed_formats } =
        imageOptions;

    // upload options
    const options = {
        public_id_prefix,
        display_name,
        asset_folder,
        allowed_formats,
    };

    return cloudinary.uploader.upload(imageBase64, options);
};

// deletes an image file from cloudinary
const deleteImage = async (publicId) => {
    // delete options
    const options = { invalidate: true };

    return cloudinary.uploader.destroy(publicId, options);
};

// Gets details of an uploaded image from cloudinary
const getImageInfo = async (publicId) => {
    return cloudinary.api.resource(publicId);
};

module.exports = {
    convertToMongooseObjectID,
    converImageToBase64Data,
    uploadImage,
    deleteImage,
    getImageInfo,
};
