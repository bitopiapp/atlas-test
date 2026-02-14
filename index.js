require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/user');
const Teacher = require('./models/teacher');
const Course = require('./models/course');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(express.json());

console.log('Starting atlas-test...');

async function start() {
	let uri = process.env.MONGO_URI;
	let mongod;

	if (!uri) {
		console.log('MONGO_URI not set — starting in-memory MongoDB for testing...');
		mongod = await MongoMemoryServer.create();
		uri = mongod.getUri();
		console.log('In-memory MongoDB URI:', uri);
	} else {
		console.log('MONGO_URI found — attempting MongoDB connection...');
	}

	mongoose
		.connect(uri)
		.then(() => {
			console.log('✅ Connected to MongoDB');

			// ==================== USER ROUTES ====================

			// GET /users — return all users
			app.get('/users', async (req, res) => {
				try {
					const users = await User.find().lean();
					res.json(users);
				} catch (err) {
					res.status(500).json({ error: 'Failed to fetch users', message: err.message });
				}
			});

			// POST /users — create a new user
			app.post('/users', async (req, res) => {
				try {
					const { name, email, role } = req.body;
					if (!name) return res.status(400).json({ error: 'Name is required' });
					const user = new User({ name, email, role });
					await user.save();
					res.status(201).json(user);
				} catch (err) {
					res.status(500).json({ error: 'Failed to create user', message: err.message });
				}
			});

			// GET /users/:id — get user by id
			app.get('/users/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const user = await User.findById(id).lean();
					if (!user) return res.status(404).json({ error: 'User not found' });
					res.json(user);
				} catch (err) {
					res.status(500).json({ error: 'Failed to fetch user', message: err.message });
				}
			});

			// PUT /users/:id — update user by id
			app.put('/users/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const updates = req.body;
					const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
					if (!user) return res.status(404).json({ error: 'User not found' });
					res.json(user);
				} catch (err) {
					res.status(500).json({ error: 'Failed to update user', message: err.message });
				}
			});

			// DELETE /users/:id — delete user by id
			app.delete('/users/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const user = await User.findByIdAndDelete(id).lean();
					if (!user) return res.status(404).json({ error: 'User not found' });
					res.json({ success: true });
				} catch (err) {
					res.status(500).json({ error: 'Failed to delete user', message: err.message });
				}
			});

			// ==================== TEACHER ROUTES ====================

			// GET /teachers — return all teachers
			app.get('/teachers', async (req, res) => {
				try {
					const teachers = await Teacher.find().lean();
					res.json(teachers);
				} catch (err) {
					res.status(500).json({ error: 'Failed to fetch teachers', message: err.message });
				}
			});

			// POST /teachers — create a new teacher
			app.post('/teachers', async (req, res) => {
				try {
					const { name, email, subject } = req.body;
					if (!name) return res.status(400).json({ error: 'Name is required' });
					if (!subject) return res.status(400).json({ error: 'Subject is required' });
					const teacher = new Teacher({ name, email, subject });
					await teacher.save();
					res.status(201).json(teacher);
				} catch (err) {
					res.status(500).json({ error: 'Failed to create teacher', message: err.message });
				}
			});

			// GET /teachers/:id — get teacher by id
			app.get('/teachers/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const teacher = await Teacher.findById(id).lean();
					if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
					res.json(teacher);
				} catch (err) {
					res.status(500).json({ error: 'Failed to fetch teacher', message: err.message });
				}
			});

			// PUT /teachers/:id — update teacher by id
			app.put('/teachers/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const updates = req.body;
					const teacher = await Teacher.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
					if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
					res.json(teacher);
				} catch (err) {
					res.status(500).json({ error: 'Failed to update teacher', message: err.message });
				}
			});

			// DELETE /teachers/:id — delete teacher by id
			app.delete('/teachers/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const teacher = await Teacher.findByIdAndDelete(id).lean();
					if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
					res.json({ success: true });
				} catch (err) {
					res.status(500).json({ error: 'Failed to delete teacher', message: err.message });
				}
			});

			// ==================== COURSE ROUTES ====================

			// GET /courses — return all courses (with teacher details)
			app.get('/courses', async (req, res) => {
				try {
					const courses = await Course.find().populate('teacher').lean();
					res.json(courses);
				} catch (err) {
					res.status(500).json({ error: 'Failed to fetch courses', message: err.message });
				}
			});

			// POST /courses — create a new course
			app.post('/courses', async (req, res) => {
				try {
					const { title, description, teacher } = req.body;
					if (!title) return res.status(400).json({ error: 'Title is required' });
					if (!teacher) return res.status(400).json({ error: 'Teacher is required' });
					const course = new Course({ title, description, teacher });
					await course.save();
					await course.populate('teacher');
					res.status(201).json(course);
				} catch (err) {
					res.status(500).json({ error: 'Failed to create course', message: err.message });
				}
			});

			// GET /courses/:id — get course by id
			app.get('/courses/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const course = await Course.findById(id).populate('teacher').lean();
					if (!course) return res.status(404).json({ error: 'Course not found' });
					res.json(course);
				} catch (err) {
					res.status(500).json({ error: 'Failed to fetch course', message: err.message });
				}
			});

			// PUT /courses/:id — update course by id
			app.put('/courses/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const updates = req.body;
					const course = await Course.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
					if (!course) return res.status(404).json({ error: 'Course not found' });
					res.json(course);
				} catch (err) {
					res.status(500).json({ error: 'Failed to update course', message: err.message });
				}
			});

			// DELETE /courses/:id — delete course by id
			app.delete('/courses/:id', async (req, res) => {
				try {
					const { id } = req.params;
					if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
					const course = await Course.findByIdAndDelete(id).lean();
					if (!course) return res.status(404).json({ error: 'Course not found' });
					res.json({ success: true });
				} catch (err) {
					res.status(500).json({ error: 'Failed to delete course', message: err.message });
				}
			});

			// ==================== HEALTH CHECK ====================
			app.get('/', (req, res) => res.json({ status: 'atlas-test running', environment: process.env.NODE_ENV }));

			const port = process.env.PORT || 3000;
			app.listen(port, () => {
				console.log(`🚀 Server running on http://localhost:${port}`);
				console.log(`📝 Environment: ${process.env.NODE_ENV}`);
			});
		})
		.catch((err) => {
			console.error('❌ MongoDB connection error:', err.message || err);
			process.exit(1);
		});

	// Cleanup on exit
	const cleanup = async () => {
		try {
			await mongoose.disconnect();
			console.log('\n✅ Disconnected from MongoDB');
		} catch (e) {}
		if (mongod) await mongod.stop();
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);
}

start();
