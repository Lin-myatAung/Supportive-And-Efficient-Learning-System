const mongoose = require("mongoose");

const discussionSchema = new mongoose.Schema({
    authorName: String,
    authorRole: String,
    postText: String
}, { timestamps: true });

module.exports = mongoose.model("Discussion", discussionSchema);
