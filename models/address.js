const mongooose = require("mongoose");

const addressSchema = new mongooose.Schema({
    label: {
        type: String,
        default: "home",
        required: true,
    },
    is_default: {
        type: Boolean,
        default: false,
    },
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
        default: "Bhopal",
    },
    state: {
        type: String,
        default: "Madhya Pradesh",
    },
    pincode: {
        type: String,
        required: true,
    },
    landmark: String,
    user_id: {
        type: mongooose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
});

module.exports = mongooose.model("Address", addressSchema);
