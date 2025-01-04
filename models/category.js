const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    image: String,
    food_items: [{ type: mongoose.Schema.Types.ObjectId, ref: "FoodItem" }],
});

module.exports = mongoose.model("Category", categorySchema);
