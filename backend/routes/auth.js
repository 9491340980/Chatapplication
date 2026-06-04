const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: 'Username or email already taken' });

    const user = await User.create({ username, email, password });
    res.status(201).json({ token: signToken(user), user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user), user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Save FCM token
router.post('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    console.log('Saving FCM token for user:', req.user.id, 'token:', fcmToken?.substring(0, 20));
    await User.findByIdAndUpdate(req.user.id, { fcmToken });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Test push notification
router.post('/test-push', authMiddleware, async (req, res) => {
  try {
    const { sendPushNotification } = require('../config/firebase');
    const user = await User.findById(req.user.id);
    if (!user.fcmToken) return res.status(400).json({ message: 'No FCM token found for user' });
    await sendPushNotification(user.fcmToken, 'Test Notification', 'Push notifications are working!', {});
    res.json({ success: true, tokenPreview: user.fcmToken.substring(0, 20) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
