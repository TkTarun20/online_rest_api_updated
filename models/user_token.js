const mongoose = require("mongoose");

const userTokenSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    token: {
        type: String,
        required: true,
    },
    expiry_at: {
        type: Date,
        default: () => Date.now() + 300000, // 5 mins
    },
});

module.exports = mongoose.model("UserToken", userTokenSchema);
