const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
    {
        food_item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodItem",
            required: true,
        },
        variant: { type: Number, required: true },
        quantity: { type: Number, required: true },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

const userSchema = new mongoose.Schema(
    {
        first_name: {
            type: String,
            required: true,
        },
        last_name: String,
        email: {
            type: String,
            required: true,
        },
        image: String,
        mobile: {
            type: String,
            required: true,
            minLength: 10,
            maxLength: 10,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: "customer",
        },
        favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "FoodItem" }],
        cart: [cartItemSchema],
    },
    {
        virtuals: {
            full_name: {
                get() {
                    return (
                        this["first_name"] +
                        (this["last_name"] ? ` ${this["last_name"]}` : "")
                    );
                },
            },
        },
    }
);

module.exports = mongoose.model("User", userSchema);
