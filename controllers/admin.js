const mongoose = require("mongoose");
const jose = require("jose");
const bcrypt = require("bcryptjs");
const { matchedData, validationResult } = require("express-validator");

const db = require("../models");
const {
    convertToMongooseObjectID,
    converImageToBase64Data,
    uploadImage,
} = require("../utils");

const login = async (req, res, next) => {
    try {
        const result = validationResult(req);

        if (!result.isEmpty()) {
            return res.status(401).json({
                message: "Invalid credentials!",
            });
        }

        const { email, password } = matchedData(req, {
            locations: ["body"],
        });

        // check if the user with given email exists
        const adminUser = await db.User.findOne({ email }, "-__v");

        if (!adminUser) {
            return res.status(401).json({
                message: "Invalid credentials!",
            });
        }

        // check password
        const match = await bcrypt.compare(password, adminUser.password);
        if (!match) {
            return res.status(401).json({
                message: "Invalid credentials!",
            });
        }

        // jwt token
        const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);
        const alg = "HS256";
        const jwtPayload = {
            adminId: adminUser._id.toString(),
            role: adminUser.role,
        };

        const jwtToken = await new jose.SignJWT(jwtPayload)
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime(`3600 secs`)
            .sign(encodedSecret);

        res.set(
            "Set-Cookie",
            `session=${jwtToken}; Max-Age=3600; HttpOnly; Secure`
        );

        res.status(200).json({
            message: "Admin user is logged in successfully!",
            data: {
                email: adminUser.email,
                role: adminUser.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        // check user is admin or not
        if (!req.adminId && req.role !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const adminId = convertToMongooseObjectID(req.adminId);

        // check admin exists or not
        const adminUser = await db.User.findById(adminId, "-__v");

        if (!adminUser) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        res.set("Set-Cookie", `session=''; Max-Age=10; HttpOnly; Secure`);

        res.status(200).json({
            message: "User is logged out successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const getCategories = async function (req, res, next) {
    try {
        // check user is admin or not
        if (!req.adminId && req.role !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const adminId = convertToMongooseObjectID(req.adminId);

        // check admin exists or not
        const adminUser = await db.User.findById(adminId, "-__v");

        if (!adminUser) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const categories = await db.Category.find({}, "-__v");

        res.status(200).json({
            message: "All categories fetched successfully!",
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

const createCategory = async function (req, res, next) {
    try {
        const { name } = req.body;
        const imageFile = req.file;

        let errors;

        // check user is admin or not
        if (!req.adminId && req.role !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const adminId = convertToMongooseObjectID(req.adminId);

        // check admin exists or not
        const adminUser = await db.User.findById(adminId, "-__v");

        if (!adminUser) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // check image type
        if (
            imageFile.mimetype !== "image/jpeg" &&
            imageFile.mimetype !== "image/png" &&
            imageFile.mimetype !== "image/svg"
        ) {
            errors = {
                image: {
                    errorType: "field",
                    message: ["Invalid file format"],
                    path: "image",
                },
            };
        }

        // check file size
        if (imageFile.size > 1 * 1024 * 1024) {
            errors = {
                image: {
                    errorType: "field",
                    message: Array.isArray(errors?.image?.message)
                        ? errors.image.message.concat(
                              "File size is greater than 1MB"
                          )
                        : ["File size is greater than 1MB"],
                    path: "image",
                },
            };
        }

        if (errors) {
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        // save image in cloudinary and then save
        // the returned public_id from cloudinary as
        // image in database;
        // upload image to cloudinary using base64 encoded data url of image
        const imageBase64Uri = converImageToBase64Data(imageFile);

        const categoryName = name.toLowerCase().replaceAll(" ", "-");

        const imageOptions = {
            public_id_prefix: "category",
            display_name: categoryName,
            asset_folder: "ck_category",
            allowed_formats: ["jpg", "png", "svg"],
        };

        const uploadRes = await uploadImage(imageBase64Uri, imageOptions);

        // image path to store in the database
        image = uploadRes.public_id;

        const category = await db.Category.create({
            name,
            image,
        });

        res.status(201).json({
            message: "Category is created successfully!",
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

const getCategory = async (req, res, next) => {
    try {
        // check user is admin or not
        if (!req.adminId && req.role !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const adminId = convertToMongooseObjectID(req.adminId);

        // check admin exists or not
        const adminUser = await db.User.findById(adminId, "-__v");

        if (!adminUser) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const categoryId = convertToMongooseObjectID(req.params.categoryId);

        const category = await db.Category.findById(categoryId, "-__v");

        if (!category) {
            return res.status(404).json({
                message: "Specified category does not exist!",
            });
        }

        res.status(200).json({
            message: "Fetched a particular category successfully!",
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

const getFoodItems = async (req, res, next) => {
    try {
        // check user is admin or not
        if (!req.adminId && req.role !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const adminId = convertToMongooseObjectID(req.adminId);

        // check admin exists or not
        const adminUser = await db.User.findById(adminId, "-__v");

        if (!adminUser) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const foodItems = await db.FoodItem.find({}, "-__v");

        res.status(200).json({
            message: "All food items fetched successfully!",
            data: foodItems,
        });
    } catch (error) {
        next(error);
    }
};

const createFoodItem = async function (req, res, next) {
    try {
        const { name, description, type, variants, category_id } = req.body;
        const imageFile = req.file;

        let errors;
        let image;

        // check user is admin or not
        if (!req.adminId && req.role !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const adminId = convertToMongooseObjectID(req.adminId);

        // check admin exists or not
        const adminUser = await db.User.findById(adminId, "-__v");

        if (!adminUser) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        if (imageFile) {
            // check image type
            if (
                imageFile.mimetype !== "image/jpeg" &&
                imageFile.mimetype !== "image/png" &&
                imageFile.mimetype !== "image/png"
            ) {
                errors = {
                    image: {
                        errorType: "field",
                        message: ["Invalid file format"],
                        path: "image",
                    },
                };
            }

            // check file size
            if (imageFile.size > 1 * 1024 * 1024) {
                errors = {
                    image: {
                        errorType: "field",
                        message: Array.isArray(errors?.image?.message)
                            ? errors.image.message.concat(
                                  "File size is greater than 1MB"
                              )
                            : ["File size is greater than 1MB"],
                        path: "image",
                    },
                };
            }
        }

        if (errors) {
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        if (imageFile) {
            // save image in cloudinary and then save
            // the returned public_id from cloudinary as
            // image in database;
            // upload image to cloudinary using base64 encoded data url of image
            const imageBase64Uri = converImageToBase64Data(imageFile);

            const foodName = name.toLowerCase().replaceAll(" ", "-");

            const imageOptions = {
                public_id_prefix: "fooditem",
                display_name: foodName,
                asset_folder: "ck_fooditems",
                allowed_formats: ["jpg", "png", "svg"],
            };

            const uploadRes = await uploadImage(imageBase64Uri, imageOptions);

            // image path to store in the database
            image = uploadRes.public_id;
        }

        const newItem = {
            name,
            ...(image && { image }),
            description,
            type,
            category_id: convertToMongooseObjectID(category_id),
            variants: JSON.parse(variants),
        };

        let newFoodItemCreated;

        // using transactions
        await mongoose.connection.transaction(async () => {
            newFoodItemCreated = await db.FoodItem.create(newItem);

            // update category with the newly created food item
            const category = await db.Category.findById(
                newFoodItemCreated.category_id
            );
            if (!category) {
                throw new Error("Category does not exist..!!");
            }

            category["food_items"].push(newFoodItemCreated._id);
            await category.save();
        });

        res.status(201).json({
            message: "Food item is created successfully!",
            data: newFoodItemCreated,
        });
    } catch (error) {
        next(error);
    }
};

const getFoodItem = async (req, res, next) => {
    try {
        // check user is admin or not
        if (!req.adminId && req.role !== "admin") {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const adminId = convertToMongooseObjectID(req.adminId);

        // check admin exists or not
        const adminUser = await db.User.findById(adminId, "-__v");

        if (!adminUser) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const foodItemId = convertToMongooseObjectID(req.params.foodItemId);

        const foodItem = await db.FoodItem.findById(foodItemId, "-__v");

        if (!foodItem) {
            return res.status(404).json({
                message: "Specified food item does not exist!",
            });
        }

        res.status(200).json({
            message: "Fetched a particular food item successfully!",
            data: foodItem,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    logout,
    getCategories,
    createCategory,
    getCategory,
    getFoodItems,
    createFoodItem,
    getFoodItem,
};
