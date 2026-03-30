const express = require('express');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/var/www/coursero/submissions';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 }, // 1MB max
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.py', '.c'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExt.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .py and .c files are allowed'));
        }
    }
});

app.use(cors());
app.use(express.json());

let db;

// Connect to MongoDB
async function connectDB() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('coursero');
    console.log('Connected to MongoDB');

    // Create indexes
    await db.collection('submissions').createIndex({ status: 1, submitted_at: 1 });
    await db.collection('submissions').createIndex({ user_email: 1 });
    await db.collection('best_grades').createIndex({ user_email: 1, course_id: 1, exercise_id: 1 }, { unique: true });
}

// ==================== COURSES ====================

// Get all courses
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await db.collection('courses').find({}).toArray();
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get course by ID
app.get('/api/courses/:id', async (req, res) => {
    try {
        const course = await db.collection('courses').findOne({ _id: req.params.id });
        if (!course) return res.status(404).json({ error: 'Course not found' });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get exercises for a course
app.get('/api/courses/:id/exercises', async (req, res) => {
    try {
        const exercises = await db.collection('exercises').find({ course_id: req.params.id }).toArray();
        res.json(exercises);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get exercise by ID
app.get('/api/exercises/:id', async (req, res) => {
    try {
        const exercise = await db.collection('exercises').findOne({ _id: req.params.id });
        if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
        res.json(exercise);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== SUBMISSIONS ====================

// Submit code for correction
app.post('/api/submit', upload.single('file'), async (req, res) => {
    try {
        const { user_email, course_id, exercise_id, language } = req.body;

        if (!user_email || !course_id || !exercise_id || !language) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!['python', 'c'].includes(language.toLowerCase())) {
            return res.status(400).json({ error: 'Language must be python or c' });
        }

        const submission = {
            user_email,
            course_id,
            exercise_id,
            language: language.toLowerCase(),
            file_path: req.file.path,
            original_filename: req.file.originalname,
            status: 'pending',
            submitted_at: new Date(),
            grade: null,
            tests_passed: null,
            tests_total: null,
            details: [],
            error: null
        };

        const result = await db.collection('submissions').insertOne(submission);

        res.status(201).json({
            message: 'Submission queued for correction',
            submission_id: result.insertedId,
            status: 'pending'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get submission status
app.get('/api/submissions/:id', async (req, res) => {
    try {
        const submission = await db.collection('submissions').findOne(
            { _id: new ObjectId(req.params.id) },
            { projection: { file_path: 0 } } // Don't expose file path
        );

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json(submission);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all submissions for a user
app.get('/api/users/:email/submissions', async (req, res) => {
    try {
        const submissions = await db.collection('submissions')
            .find({ user_email: req.params.email })
            .project({ file_path: 0 })
            .sort({ submitted_at: -1 })
            .toArray();

        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's best grades
app.get('/api/users/:email/grades', async (req, res) => {
    try {
        const grades = await db.collection('best_grades')
            .find({ user_email: req.params.email })
            .toArray();

        res.json(grades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get exercise status for user (not submitted / pending / scored)
app.get('/api/users/:email/exercises/:courseId/:exerciseId/status', async (req, res) => {
    try {
        const { email, courseId, exerciseId } = req.params;

        // Check for pending submission
        const pending = await db.collection('submissions').findOne({
            user_email: email,
            course_id: courseId,
            exercise_id: exerciseId,
            status: { $in: ['pending', 'processing'] }
        });

        if (pending) {
            return res.json({ status: 'awaiting_correction', submission_id: pending._id });
        }

        // Check for best grade
        const best = await db.collection('best_grades').findOne({
            user_email: email,
            course_id: courseId,
            exercise_id: exerciseId
        });

        if (best) {
            return res.json({
                status: 'scored',
                grade: best.grade,
                updated_at: best.updated_at
            });
        }

        res.json({ status: 'not_submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== QUEUE STATUS ====================

// Get queue stats (for admin/debugging)
app.get('/api/queue/stats', async (req, res) => {
    try {
        const pending = await db.collection('submissions').countDocuments({ status: 'pending' });
        const processing = await db.collection('submissions').countDocuments({ status: 'processing' });
        const completed = await db.collection('submissions').countDocuments({ status: 'completed' });
        const failed = await db.collection('submissions').countDocuments({ status: 'failed' });

        res.json({ pending, processing, completed, failed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Coursero API running on port ${PORT}`);
    });
}).catch(console.error);
