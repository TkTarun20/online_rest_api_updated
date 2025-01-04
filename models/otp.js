const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expiry_at: {
        type: Date,
        default: () => Date.now() + 300000, // 5 mins
    },
});

module.exports = mongoose.model("Otp", otpSchema);
