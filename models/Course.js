const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
    number: String,
    title: String,
    desc: String,
    file: String,
    link: String
});

const courseSchema = new mongoose.Schema({
    name: String,
    department: String,
    year: String,
    semester: String,
    teacher: String, 
    lessons: [lessonSchema]
});

module.exports = mongoose.model("Course", courseSchema);