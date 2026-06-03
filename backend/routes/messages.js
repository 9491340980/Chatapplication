const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all users + last message + unread count per user
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const users = await User.find({ _id: { $ne: myId } }).select('-password');

    const withSummary = await Promise.all(
      users.map(async (user) => {
        const lastMsg = await Message.findOne({
          $or: [
            { sender: myId, receiver: user._id },
            { sender: user._id, receiver: myId }
          ]
        })
          .sort({ createdAt: -1 })
          .populate('sender', 'username');

        const unreadCount = await Message.countDocuments({
          sender: user._id,
          receiver: myId,
          read: false
        });

        return {
          _id: user._id,
          username: user.username,
          email: user.email,
          isOnline: user.isOnline,
          lastMessage: lastMsg
            ? {
                text: lastMsg.text,
                createdAt: lastMsg.createdAt,
                isMine: lastMsg.sender._id.toString() === myId.toString()
              }
            : null,
          unreadCount
        };
      })
    );

    // Sort: users with messages first (by most recent), then rest
    withSummary.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    res.json(withSummary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get conversation between two users
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user.id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
