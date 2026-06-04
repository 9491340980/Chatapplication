require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { initFirebase, sendPushNotification } = require('./config/firebase');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const User = require('./models/User');

connectDB();
initFirebase();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Map userId -> socketId for online presence
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.user.id;
  onlineUsers.set(userId, socket.id);
  await User.findByIdAndUpdate(userId, { isOnline: true });

  // Notify all that this user is online
  socket.broadcast.emit('user:online', userId);

  // Send current online users list to the newly connected client
  socket.emit('users:online', Array.from(onlineUsers.keys()));

  socket.on('message:send', async ({ receiverId, text, type = 'text', fileUrl = '' }) => {
    try {
      const msg = await Message.create({ sender: userId, receiver: receiverId, text, type, fileUrl });
      const populated = await msg.populate(['sender', 'receiver']);

      const payload = {
        _id: populated._id,
        sender: { _id: populated.sender._id, username: populated.sender.username },
        receiver: { _id: populated.receiver._id, username: populated.receiver.username },
        text: populated.text,
        type: populated.type,
        fileUrl: populated.fileUrl,
        read: populated.read,
        createdAt: populated.createdAt
      };

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:receive', payload);
      } else {
        // Receiver is offline — send push notification
        const receiver = await User.findById(receiverId).select('fcmToken username');
        console.log('Receiver offline, fcmToken:', receiver?.fcmToken ? 'EXISTS' : 'MISSING');
        if (receiver?.fcmToken) {
          const sender = await User.findById(userId).select('username');
          const notifBody = payload.type === 'image' ? '📷 Photo' :
                            payload.type === 'video' ? '🎥 Video' : payload.text;
          await sendPushNotification(
            receiver.fcmToken,
            sender.username,
            notifBody,
            { senderId: userId, senderName: sender.username, type: payload.type }
          );
        }
      }

      // Echo back to sender
      socket.emit('message:sent', payload);
    } catch (err) {
      socket.emit('message:error', { message: err.message });
    }
  });

  socket.on('typing:start', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:start', { userId });
    }
  });

  socket.on('typing:stop', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:stop', { userId });
    }
  });

  socket.on('disconnect', async () => {
    onlineUsers.delete(userId);
    await User.findByIdAndUpdate(userId, { isOnline: false });
    socket.broadcast.emit('user:offline', userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
