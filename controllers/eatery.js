const db = require("../models");

const getMenu = async (req, res, next) => {
    try {
        const categories = await db.Category.find({}, "-image -__v").populate(
            "food_items",
            "-created_at -updated_at -__v"
        );

        res.status(200).json({
            message: "All categories are fetched successfully!",
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

const getRandomCategories = async (req, res, next) => {
    try {
        const categories = await db.Category.aggregate()
            .sample(6)
            .project("name image");

        res.status(200).json({
            message: "Categories fetched successfully!",
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMenu,
    getRandomCategories,
};
