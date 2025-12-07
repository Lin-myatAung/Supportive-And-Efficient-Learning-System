const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    role: {type: String, enum: ["teacher", "student"], required: true},
    department: {type: String, required: true},
    year: {type: String},
    semester: {type: String},
    name: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
}, {timestamps: true});

module.exports = mongoose.model("User", userSchema);