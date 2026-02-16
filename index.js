require('dotenv').config();
const express = require('express');
const sequelize = require('./models/index');
const Device = require('./models/device');
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
		app.post('/api/login', async (req, res) => {
			const { username, password } = req.body;

			// 1. Check users table (login by email or name)
			const dbUser = await User.findOne({
				where: { email: username }
			});
			if (dbUser && dbUser.password === password) {
				const token = jwt.sign(
					{ id: dbUser.id, name: dbUser.name, email: dbUser.email, roll: dbUser.roll },
					process.env.JWT_SECRET,
					{ expiresIn: '24h' }
				);
				return res.json({ token, user: { id: dbUser.id, name: dbUser.name, roll: dbUser.roll } });
			}

			// 2. Fallback: .env super admin (always works)
			if (
				username === process.env.ADMIN_USERNAME &&
				password === process.env.ADMIN_PASSWORD
			) {
				const token = jwt.sign({ role: 'admin', name: 'Super Admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
				return res.json({ token, user: { name: 'Super Admin', roll: 'Admin' } });
			}

			res.status(401).json({ error: 'Invalid username or password' });
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
				const decoded = jwt.verify(token, process.env.JWT_SECRET);
				req.user = decoded;
				next();
			} catch {
				res.status(401).json({ error: 'Invalid token' });
			}
		}

		// ==================== DEVICE ROUTES ====================

		// GET /devices — return devices (filtered by user if not admin)
		app.get('/devices', authMiddleware, async (req, res) => {
			try {
				let where = {};
				// If user roll is 'User', only show their devices
				if (req.user.roll === 'User') {
					where.adminId = String(req.user.id);
				}
				const devices = await Device.findAll({ where });
				res.json(devices);
			} catch (err) {
				res.status(500).json({ error: 'Failed to fetch devices', message: err.message });
			}
		});


		// GET /create-device — create a new device via query params
		// Usage: /create-device?name=John&adminId=admin1&deviceToken=abc123
		app.get('/create-device', async (req, res) => {
			try {
				const { name, adminId, status, deviceToken } = req.query;
				if (!name) return res.status(400).json({ error: 'Name is required' });
				if (!adminId) return res.status(400).json({ error: 'Admin ID is required' });
				if (!deviceToken) return res.status(400).json({ error: 'Device token is required' });
				const existingUser = await Device.findOne({ where: { deviceToken } });
				if (existingUser) {
					return res.status(409).json({ error: 'Already device created' });
				}
				const user = await Device.create({ name, adminId, status, deviceToken });
				res.status(201).json(user);
			} catch (err) {
				res.status(500).json({ error: 'Failed to create device', message: err.message });
			}
		});

		// POST /users — create a new user
		app.post('/devices', async (req, res) => {
			try {
				const { name, adminId, status, deviceToken } = req.body;
				if (!name) return res.status(400).json({ error: 'Name is required' });
				if (!adminId) return res.status(400).json({ error: 'Admin ID is required' });
				if (!deviceToken) return res.status(400).json({ error: 'Device token is required' });
				// Check if a user with this deviceToken already exists
				const existingUser = await Device.findOne({ where: { deviceToken } });
				if (existingUser) {
					return res.status(409).json({ error: 'Already device created' });
				}
				const user = await Device.create({ name, adminId, status, deviceToken });
				res.status(201).json(user);
			} catch (err) {
				res.status(500).json({ error: 'Failed to create device', message: err.message });
			}
		});

		// GET /user-updateLocation — update user lat/lon via query params
		// Usage: /user-updateLocation?deviceToken=abc123&latitude=23.8103&longitude=90.4125
		app.get('/device-updateLocation', async (req, res) => {
			try {
				const { deviceToken, latitude, longitude } = req.query;
				if (!deviceToken) return res.status(400).json({ error: 'Device token is required' });
				if (!latitude) return res.status(400).json({ error: 'Latitude is required' });
				if (!longitude) return res.status(400).json({ error: 'Longitude is required' });
				const user = await Device.findOne({ where: { deviceToken } });
				if (!user) return res.status(404).json({ error: 'Device not found' });
				await user.update({ latitude, longitude });
				res.json({ success: true, message: 'Location updated', latitude, longitude });
			} catch (err) {
				res.status(500).json({ error: 'Failed to update location', message: err.message });
			}
		});

		// GET /user-updateDeviceInfo — update device info via query params
		// Usage: /user-updateDeviceInfo?deviceToken=abc123&brand=Samsung&model=Galaxy S21&androidVersion=13&...
		app.get('/device-updateDeviceInfo', async (req, res) => {
			try {
				const { deviceToken, ...info } = req.query;
				if (!deviceToken) return res.status(400).json({ error: 'Device token is required' });
				const user = await Device.findOne({ where: { deviceToken } });
				if (!user) return res.status(404).json({ error: 'Device not found' });
				await user.update({ deviceInfo: JSON.stringify(info) });
				res.json({ success: true, message: 'Device info updated' });
			} catch (err) {
				res.status(500).json({ error: 'Failed to update device info', message: err.message });
			}
		});

		// GET /users/:id — get user by id
		app.get('/devices/:id', authMiddleware, async (req, res) => {
			try {
				const user = await Device.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'Device not found' });
				res.json(user);
			} catch (err) {
				res.status(500).json({ error: 'Failed to fetch device', message: err.message });
			}
		});

		// PUT /users/:id — update user by id
		app.put('/devices/:id', authMiddleware, async (req, res) => {
			try {
				const user = await Device.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'Device not found' });
				const oldStatus = user.status;
				await user.update(req.body);

				// Send FCM data message to device if status changed
				if (req.body.status && req.body.status !== oldStatus && user.deviceToken) {
					const action = req.body.status === 'lock' ? 'Lock Device' : 'Unlock Device';
					const message = {
						data: {
							userId: String(user.id),
							name: user.name,
							body: action,
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
				res.status(500).json({ error: 'Failed to update device', message: err.message });
			}
		});

		// POST /users/:id/register-device — register FCM device token
		app.post('/devices/:id/register-device', async (req, res) => {
			try {
				const user = await Device.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'Device not found' });
				// Remove token from any other user first
				await Device.update({ deviceToken: null }, { where: { deviceToken: req.body.deviceToken } });
				await user.update({ deviceToken: req.body.deviceToken });
				res.json({ success: true, message: 'Device registered' });
			} catch (err) {
				res.status(500).json({ error: 'Failed to register device', message: err.message });
			}
		});

		// POST /users/:id/send-command — send FCM command to device
		app.post('/devices/:id/send-command', authMiddleware, async (req, res) => {
			try {
				const user = await Device.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'Device not found' });
				if (!user.deviceToken) return res.status(400).json({ error: 'No device token registered' });

				const { command, message: msgText } = req.body;
				if (!command) return res.status(400).json({ error: 'Command is required' });

				// Save setting state to database
				const settingMap = {
					factory_reset_enable: { factoryReset: 'enable', status: 'factory_reset_enable' },
					factory_reset_disable: { factoryReset: 'disable', status: 'factory_reset_disable' },
					location_enable: { location: 'enable', status: 'location_enable' },
					location_disable: { location: 'disable', status: 'location_disable' },
					battery_status_enable: { batteryStatus: 'enable', status: 'battery_status_enable' },
					battery_status_disable: { batteryStatus: 'disable', status: 'battery_status_disable' },
					camera_enable: { camera: 'enable', status: 'camera_enable' },
					camera_disable: { camera: 'disable', status: 'camera_disable' },
					wifi_enable: { wifi: 'enable', status: 'wifi_enable' },
					wifi_disable: { wifi: 'disable', status: 'wifi_disable' },
					bluetooth_enable: { bluetooth: 'enable', status: 'bluetooth_enable' },
					bluetooth_disable: { bluetooth: 'disable', status: 'bluetooth_disable' },
					lock_device_enable: { lockDevice: 'enable', status: 'lock' },
					lock_device_disable: { lockDevice: 'disable', status: 'unlock' },
				};

				if (settingMap[command]) {
					await user.update(settingMap[command]);
				}

				const fcmData = { 
							userId: String(user.id),
							name: user.name,
							body: 
							command == 'factory_reset_enable' ? `Factory Reset Enable` 
							:
							command == 'factory_reset_disable' ? `Factory Reset Disable` 
							:
							command == 'location_enable' ? `Location Enable` 
							:
							command == 'location_disable' ? `Location Disable` 
							:
							command == 'battery_status_enable' ? `Battery Status Enable` 
							:
							command == 'battery_status_disable' ? `Battery Status Disable` 
							:
							command == 'camera_enable' ? `Camera Enable`
							:
							command == 'camera_disable' ? `Camera Disable`
							:
							command == 'wifi_enable' ? `Wi-Fi Enable`
							:
							command == 'wifi_disable' ? `Wi-Fi Disable`
							:
							command == 'bluetooth_enable' ? `Bluetooth Enable`
							:
							command == 'bluetooth_disable' ? `Bluetooth Disable`
							:
							command == 'lock_device_enable' ? `Lock Device`
							:
							command == 'lock_device_disable' ? `Active Device` 
							:
							command == 'send_message' ? `${msgText}` 
							: command,
							status: user.status,
							updatedAt: new Date().toISOString(),
					};

				if (command === 'send_message' && msgText) {
					fcmData.message = msgText;
				}

				const message = {
					data: fcmData,
					token: user.deviceToken,
				};

				try {
					await firebaseAdmin.messaging().send(message);
					console.log(`FCM command sent to ${user.name}: ${command}`);
				} catch (fcmErr) {
					console.error('FCM send error:', fcmErr.message);
				}

				res.json({ success: true, message: `Command '${command}' sent to device` });
			} catch (err) {
				console.error('Command error:', err.message);
				res.status(500).json({ error: 'Failed to send command', message: err.message });
			}
		});

		// DELETE /users/:id — delete user by id
		app.delete('/devices/:id', authMiddleware, async (req, res) => {
			try {
				const user = await Device.findByPk(req.params.id);
				if (!user) return res.status(404).json({ error: 'Device not found' });
				await user.destroy();
				res.json({ success: true });
			} catch (err) {
				res.status(500).json({ error: 'Failed to delete device', message: err.message });
			}
		});

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
				const { name, employeeId, email, phone, password, roll } = req.body;
				if (!name) return res.status(400).json({ error: 'Name is required' });
				if (!email) return res.status(400).json({ error: 'Email is required' });
				if (!password) return res.status(400).json({ error: 'Password is required' });
				const existingUser = await User.findOne({ where: { email } });
				if (existingUser) {
					return res.status(409).json({ error: 'Email already exists' });
				}
				const user = await User.create({ name, employeeId, email, phone, password, roll });
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
				await user.update(req.body);
				res.json(user);
			} catch (err) {
				res.status(500).json({ error: 'Failed to update user', message: err.message });
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
