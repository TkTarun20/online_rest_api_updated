const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        image: String,
        description: String,
        type: {
            type: String,
            required: true,
        },
        variants: [
            {
                measurement: {
                    quantity: String,
                    unit: String,
                },
                price: { type: Number, required: true },
            },
        ],
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

module.exports = mongoose.model("FoodItem", foodItemSchema);
