const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        order_status: {
            type: String,
            default: "pending", // paid, confirmed, cooked, completed, failed(error)
        },
        order_fulfilled: {
            type: Boolean,
            default: false,
        },
        order_items: [
            {
                food_item_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                },
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
                variant: {
                    measurement: {
                        quantity: String,
                        unit: String,
                    },
                    price: { type: Number, required: true },
                },
                quantity: {
                    type: Number,
                    required: true,
                },
            },
        ],
        delivery_address: {
            house: {
                type: String,
                required: true,
            },
            locality: {
                type: String,
                required: true,
            },
            city: {
                type: String,
                required: true,
            },
            state: {
                type: String,
                required: true,
            },
            pincode: {
                type: String,
                required: true,
            },
            landmark: String,
        },
        user_details: {
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            email: {
                type: String,
                required: true,
            },
            mobile: {
                type: String,
                required: true,
                minLength: 10,
                maxLength: 10,
            },
        },
        payment_status: {
            type: String,
            default: "unpaid", // paid, failed
        },
        payment_method: String,
        delivery_amount: {
            type: Number,
            required: true,
        },
        delivery_discount: {
            type: Number,
            required: true,
        },
        total_amount: {
            type: Number,
            required: true,
        },
        invoice_id: String,
        refund: {
            status: {
                type: String,
                default: "uninitiate", // uninitiate, paid
            },
            amount: {
                type: Number,
                default: 0,
            },
            refunded_at: Date,
        },
        delivered_at: Date,
        expired_at: {
            type: Date,
            default: () => {
                // 30mins after order created
                return Date.now() + 1800000;
            },
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    }
);

module.exports = mongoose.model("Order", orderSchema);
