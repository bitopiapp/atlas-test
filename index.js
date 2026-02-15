require('dotenv').config();
const express = require('express');
const sequelize = require('./models/index');
const User = require('./models/user');

const path = require('path');
const jwt = require('jsonwebtoken');
const firebaseAdmin = require('./firebase');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('Starting atlas-test...');

async function start() {
	try {
		// Test database connection
		await sequelize.authenticate();
		console.log('✅ Database connected successfully');

		// Sync all models (creates tables if they don't exist)
		await sequelize.sync({ alter: true });
		console.log('✅ Tables synced');

		// ==================== LOGIN ====================
		app.post('/api/login', (req, res) => {
			const { username, password } = req.body;
			if (
				username === process.env.ADMIN_USERNAME &&
				password === process.env.ADMIN_PASSWORD
			) {
				const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
				res.json({ token });
			} else {
				res.status(401).json({ error: 'Invalid username or password' });
			}
		});

		// Verify token endpoint
		app.get('/api/verify', (req, res) => {
			const token = req.headers.authorization?.split(' ')[1];
			if (!token) return res.status(401).json({ error: 'No token' });
			try {
				jwt.verify(token, process.env.JWT_SECRET);
				res.json({ valid: true });
			} catch {
				res.status(401).json({ error: 'Invalid token' });
			}
		});

		// ==================== AUTH MIDDLEWARE ====================
		function authMiddleware(req, res, next) {
			const token = req.headers.authorization?.split(' ')[1];
			if (!token) return res.status(401).json({ error: 'Unauthorized' });
			try {
				jwt.verify(token, process.env.JWT_SECRET);
				next();
			} catch {
				res.status(401).json({ error: 'Invalid token' });
			}
		}

		// ==================== USER ROUTES ====================

		// GET /users — return all users
		app.get('/users', authMiddleware, async (req, res) => {
			try {
				const users = await User.findAll();
				res.json(users);
			} catch (err) {
				res.status(500).json({ error: 'Failed to fetch users', message: err.message });
			}
		});

		// POST /users — create a new user
		app.post('/users', authMiddleware, async (req, res) => {
			try {
				const { name, email, status, deviceToken } = req.body;
				if (!name) return res.status(400).json({ error: 'Name is required' });
				if (!email) return res.status(400).json({ error: 'Email is required' });
				if (!deviceToken) return res.status(400).json({ error: 'Device token is required' });
				// Remove token from any other user first
				if (deviceToken) {
					await User.update({ deviceToken: null }, { where: { deviceToken } });
				}
				const user = await User.create({ name, email, status, deviceToken });
				res.status(201).json(user);
			} catch (err) {
				res.status(500).json({ error: 'Failed to create user', message: err.message });
			}
		});

		// GET /users/:id — get user by id
		app.get('/users/:id', authMiddleware, async (req, res) => {
			try {
				const user = await User.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'User not found' });
				res.json(user);
			} catch (err) {
				res.status(500).json({ error: 'Failed to fetch user', message: err.message });
			}
		});

		// PUT /users/:id — update user by id
		app.put('/users/:id', authMiddleware, async (req, res) => {
			try {
				const user = await User.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'User not found' });
				const oldStatus = user.status;
				await user.update(req.body);

				// Send FCM data message to device if status changed
				if (req.body.status && req.body.status !== oldStatus && user.deviceToken) {
					const action = req.body.status === 'lock' ? 'lock_device' : 'unlock_device';
					const message = {
						data: {
							userId: String(user.id),
							name: user.name,
							action: action,
							status: req.body.status,
							updatedAt: new Date().toISOString(),
						},
						token: user.deviceToken,
					};
					try {
						await firebaseAdmin.messaging().send(message);
						console.log(`FCM sent to ${user.name}: ${action}`);
					} catch (fcmErr) {
						console.error('FCM send error:', fcmErr.message);
					}
				}

				res.json(user);
			} catch (err) {
				res.status(500).json({ error: 'Failed to update user', message: err.message });
			}
		});

		// POST /users/:id/register-device — register FCM device token
		app.post('/users/:id/register-device', async (req, res) => {
			try {
				const user = await User.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'User not found' });
				// Remove token from any other user first
				await User.update({ deviceToken: null }, { where: { deviceToken: req.body.deviceToken } });
				await user.update({ deviceToken: req.body.deviceToken });
				res.json({ success: true, message: 'Device registered' });
			} catch (err) {
				res.status(500).json({ error: 'Failed to register device', message: err.message });
			}
		});

		// DELETE /users/:id — delete user by id
		app.delete('/users/:id', authMiddleware, async (req, res) => {
			try {
				const user = await User.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'User not found' });
				await user.destroy();
				res.json({ success: true });
			} catch (err) {
				res.status(500).json({ error: 'Failed to delete user', message: err.message });
			}
		});

		// ==================== HEALTH CHECK ====================
		app.get('/api/health', (req, res) => res.json({
			status: 'atlas-test running',
			environment: process.env.NODE_ENV,
			database: process.env.DB_DIALECT || 'sqlite'
		}));

		const port = process.env.PORT || 3000;
		app.listen(port, () => {
			console.log(`🚀 Server running on http://localhost:${port}`);
			console.log(`📝 Environment: ${process.env.NODE_ENV}`);
			console.log(`💾 Database: ${process.env.DB_DIALECT || 'sqlite'}`);
		});

	} catch (err) {
		console.error('❌ Database connection error:', err.message);
		process.exit(1);
	}
}

start();
