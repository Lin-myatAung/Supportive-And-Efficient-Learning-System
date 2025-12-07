const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken"); 
const multer = require("multer"); 
const path = require("path");     
const fs = require("fs");         // File System for cleanup

// Models 
const User = require("./models/User");
const Course = require("./models/Course");

const app = express();
app.use(cors());
app.use(express.json()); 
app.use(express.static("public"));

// Define a secure JWT Secret Key (CRITICAL: CHANGE THIS IN PRODUCTION)
const ACCESS_TOKEN_SECRET = "your_super_secure_secret_key_12345"; 

// ----------------- MULTER CONFIGURATION -----------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'files');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir); 
    },
    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname);
        const fileName = path.basename(file.originalname, fileExt);
        cb(null, `${fileName}-${Date.now()}${fileExt}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        // Allow PDF and PowerPoint files
        if (file.mimetype === 'application/pdf' || file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) {
            cb(null, true);
        } else {
            // Reject file if type is not allowed
            cb(null, false);
        }
    }
});
// ----------------- END MULTER CONFIGURATION -----------------


// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ success: false, msg: "Authentication token missing." });

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, msg: "Invalid or expired token. Please log in again." });
        
        req.user = user; 
        next();
    });
}

// ----------------- DATABASE -----------------

// --- TEMPORARY FUNCTION TO INITIALIZE/SEED DATABASE COURSES ---
const seedCourses = async () => {
    try {
        const courses = [
            { name: "E 41011 English", teacher: "Daw Khin Win Myint", department: "it", year: "iv", semester: "2", lessons: [] },
            { name: "EM 41007 Engineering Mathematics", teacher: "Daw Nyein Su Mon Htwe", department: "it", year: "iv", semester: "2", lessons: [] },
            { name: "IT 41017 Modern Control System", teacher: "Daw Ei Myat Mon", department: "it", year: "iv", semester: "2", lessons: [] },
            { name: "IT 41023 Computer Architecture and Organization", teacher: "Daw Khin Moh Moh Win", department: "it", year: "iv", semester: "2", lessons: [] },
            { name: "IT 41026 Advanced Data Management Techniques", teacher: "Daw Than Win", department: "it", year: "iv", semester: "2", lessons: [] },
            { name: "Advanced Computer Networks", teacher: "Daw Ei Thet Mon", department: "it", year: "iv", semester: "2", lessons: [] },
            { name: "Operating System", teacher: "U Hein Thet Aung", department: "it", year: "iv", semester: "2", lessons: [] }
        ];

        const count = await Course.countDocuments();
        
        if (count === 0) {
            await Course.insertMany(courses);
            console.log("Database seeded with initial course data! 📚");
        } else {
            console.log(`Course collection already contains ${count} documents. Skipping seed.`);
        }

    } catch (error) {
        console.error("Error seeding database:", error);
    }
};


const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/my-lms");
        console.log("MongoDB connected");
        await seedCourses(); 
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
};
connectDB();

// ----------------- USER ROUTES (SIGNUP/LOGIN) -----------------

app.post("/signup", async (req, res) => {
    const { name, role, department, year, semester, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ name });
        if (existingUser) return res.status(400).json({ msg: "User already exists" });

        const newUser = new User({ name, role, department, year, semester, email, password });
        await newUser.save();

        const accessToken = jwt.sign(
            { role: newUser.role, name: newUser.name, id: newUser._id }, 
            ACCESS_TOKEN_SECRET, 
            { expiresIn: '1h' }
        );
        
        res.json({ msg: "Signup successful. Logged in.", user: newUser, token: accessToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});

app.post("/login", async (req, res) => {
    const { name, role, email, password } = req.body;
    try {
        const user = await User.findOne({ name, role, email });
        if (!user) return res.status(400).json({ msg: "User not found" });
        if (user.password !== password) return res.status(400).json({ msg: "Incorrect password" });

        const accessToken = jwt.sign(
            { role: user.role, name: user.name, id: user._id }, 
            ACCESS_TOKEN_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ msg: "Login successful", user, token: accessToken }); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
});


// ----------------- COURSE API ROUTES -----------------

// 1. GET: Find a single course by Name and Teacher
app.get("/api/courses/course", async (req, res) => {
    const { name, teacher } = req.query;
    
    if (!name || !teacher) return res.status(400).json({ success: false, msg: "Missing course name or teacher" });

    try {
        const course = await Course.findOne({ 
            name: name, 
            teacher: teacher 
        }).lean();
        
        if (!course) {
            return res.status(404).json({ success: false, msg: "Course not found in database." });
        }
        res.json({ success: true, course });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: "Server error during course lookup." });
    }
});

// 2. GET: Find course by ID (Needed for re-fetching after delete/edit)
app.get("/api/courses/id/:courseId", async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId).lean();

        if (!course) {
             return res.status(404).json({ success: false, msg: "Course not found." });
        }
        res.json({ success: true, course });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: "Server error." });
    }
});


// 3. POST: Add lesson to a course (SECURE, AUTHORIZED, AND FILE-HANDLING)
app.post("/api/courses/:id/lessons", authenticateToken, upload.single('lessonFile'), async (req, res) => {
    const courseId = req.params.id;
    const { title, number, desc, link } = req.body; 
    const fileName = req.file ? req.file.filename : ''; 
    
    if (req.user.role !== 'teacher') {
        if (req.file) fs.unlinkSync(req.file.path); 
        return res.status(403).json({ success: false, msg: "Forbidden: Only teachers can add lessons." });
    }
    
    if (!title || !number) {
        if (req.file) fs.unlinkSync(req.file.path); 
        return res.status(400).json({ success: false, msg: "Missing lesson title or number." });
    }

    const lesson = { title, number, desc: desc || '', file: fileName, link: link || '' };

    try {
        const updatedCourse = await Course.findOneAndUpdate(
            { _id: courseId, teacher: req.user.name }, // Authorization check
            { $push: { lessons: lesson } },
            { new: true }
        );
        
        if (!updatedCourse) {
            if (req.file) fs.unlinkSync(req.file.path); 
            return res.status(403).json({ success: false, msg: "Authorization failed. You are not the instructor of this course." });
        }
        
        res.json({ success: true, msg: "Lesson added", course: updatedCourse });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path); 
        console.error(err);
        res.status(500).json({ success: false, msg: "Server error during lesson addition." });
    }
});


// 4. PUT: Update an existing lesson in a course (SECURE, AUTHORIZED, AND FILE-HANDLING)
app.put("/api/courses/:courseId/lessons/:lessonId", authenticateToken, upload.single('lessonFile'), async (req, res) => {
    const { courseId, lessonId } = req.params;
    const { title, number, desc, link } = req.body;
    const newFile = req.file; 
    
    if (req.user.role !== 'teacher') {
        if (newFile) fs.unlinkSync(newFile.path); 
        return res.status(403).json({ success: false, msg: "Forbidden: Only teachers can update lessons." });
    }

    try {
        const course = await Course.findOne({ 
            _id: courseId, 
            teacher: req.user.name 
        });

        if (!course) {
            if (newFile) fs.unlinkSync(newFile.path); 
            return res.status(403).json({ success: false, msg: "Authorization failed. Course not found or you are not the instructor." });
        }

        const lessonToUpdate = course.lessons.id(lessonId);
        if (!lessonToUpdate) {
            if (newFile) fs.unlinkSync(newFile.path); 
            return res.status(404).json({ success: false, msg: "Lesson not found within the course." });
        }
        
        const oldFileName = lessonToUpdate.file;

        // Update fields
        lessonToUpdate.title = title;
        lessonToUpdate.number = number;
        lessonToUpdate.desc = desc || '';
        lessonToUpdate.link = link || '';

        // Handle File Update
        if (newFile) {
            // New file uploaded: update filename and clean up old file
            lessonToUpdate.file = newFile.filename; 
            if (oldFileName) {
                const filePath = path.join(__dirname, 'public', 'files', oldFileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        
        await course.save();

        res.json({ success: true, msg: "Lesson updated successfully", course: course });
    } catch (err) {
        if (newFile) fs.unlinkSync(newFile.path); 
        console.error(err);
        res.status(500).json({ success: false, msg: "Server error during lesson update." });
    }
});


// 5. DELETE: Remove a lesson from a course (SECURE & AUTHORIZED)
app.delete("/api/courses/:courseId/lessons/:lessonId", authenticateToken, async (req, res) => {
    const { courseId, lessonId } = req.params;
    
    if (req.user.role !== 'teacher') 
        return res.status(403).json({ success: false, msg: "Forbidden: Only teachers can delete lessons." });
    
    try {
        const courseBeforeUpdate = await Course.findById(courseId);
        if (!courseBeforeUpdate) {
            return res.status(404).json({ success: false, msg: "Course not found." });
        }

        const lessonToDelete = courseBeforeUpdate.lessons.id(lessonId);
        if (!lessonToDelete) {
             return res.status(404).json({ success: false, msg: "Lesson not found." });
        }
        const fileName = lessonToDelete.file;

        // Find and pull the lesson only if the teacher is the owner
        const updatedCourse = await Course.findOneAndUpdate(
            { _id: courseId, teacher: req.user.name },
            { $pull: { lessons: { _id: lessonId } } },
            { new: true }
        );
        
        if (!updatedCourse) {
            return res.status(403).json({ 
                success: false, msg: "Authorization failed. You are not the instructor of this course." 
            });
        }

        // Cleanup: Delete the file from the file system
        if (fileName) {
            const filePath = path.join(__dirname, 'public', 'files', fileName);
            if (fs.existsSync(filePath)) {
                 fs.unlinkSync(filePath);
            }
        }
        
        res.json({ success: true, msg: "Lesson deleted successfully", course: updatedCourse });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: "Server error during lesson deletion." });
    }
});


// 6. GET: Find all courses taught by a specific teacher
app.get("/api/courses/teacher/:name", async (req, res) => {
    try {
        const teacherName = req.params.name;
        const courses = await Course.find({ teacher: teacherName }).lean();
        res.json({ success: true, courses });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: "Server error." });
    }
});

// 2/12 new codes
const discussionRoutes = require("./routes/discussionRoutes");

app.use("/api/discussion", discussionRoutes);



// ----------------- START SERVER -----------------
const PORT = 3500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));