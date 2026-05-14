import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

const connectedUsers = new Map();

export const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Add to connected users
    connectedUsers.set(socket.userId, socket.id);
    
    // Update user online status
    User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: new Date()
    }).exec();

    // Notify contacts
    socket.broadcast.emit('user-online', { userId: socket.userId });

    // Join user's room
    socket.join(`user:${socket.userId}`);

    // Join user's chats
    Chat.find({ participants: socket.userId })
      .then(chats => {
        chats.forEach(chat => {
          socket.join(`chat:${chat._id}`);
        });
      });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, type, replyTo } = data;

        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.userId
        });

        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        const message = await Message.create({
          chatId,
          senderId: socket.userId,
          type: type || 'text',
          content,
          replyTo,
          deliveredTo: [socket.userId]
        });

        chat.lastMessage = message._id;
        chat.lastMessageAt = new Date();

        // Update unread counts
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== socket.userId) {
            const current = chat.unreadCount?.get(participantId.toString()) || 0;
            chat.unreadCount.set(participantId.toString(), current + 1);
          }
        });

        await chat.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'displayName profilePhoto')
          .populate('replyTo');

        // Emit to all participants
        io.to(`chat:${chatId}`).emit('new-message', {
          message: populatedMessage,
          chatId
        });

        // Update chat list
        chat.participants.forEach(participantId => {
          io.to(`user:${participantId}`).emit('chat-updated', {
            chatId,
            lastMessage: populatedMessage
          });
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Typing indicator
    socket.on('typing', async (data) => {
      const { chatId, isTyping } = data;
      socket.to(`chat:${chatId}`).emit('user-typing', {
        userId: socket.userId,
        chatId,
        isTyping
      });
    });

    // Mark as read
    socket.on('mark-read', async (data) => {
      try {
        const { chatId } = data;
        const chat = await Chat.findById(chatId);
        
        if (!chat || !chat.participants.includes(socket.userId)) {
          return;
        }

        await Message.updateMany(
          {
            chatId,
            senderId: { $ne: socket.userId },
            'readBy.userId': { $ne: socket.userId }
          },
          {
            $push: {
              readBy: {
                userId: socket.userId,
                readAt: new Date()
              }
            }
          }
        );

        chat.unreadCount.set(socket.userId.toString(), 0);
        await chat.save();

        io.to(`chat:${chatId}`).emit('messages-read', {
          chatId,
          userId: socket.userId
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Call events
    socket.on('call-initiate', (data) => {
      const { targetUserId, callId, type } = data;
      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          callId,
          fromUserId: socket.userId,
          type
        });
      }
    });

    socket.on('call-answer', (data) => {
      const { callId, answererId } = data;
      io.to(`call:${callId}`).emit('call-answered', {
        callId,
        answererId
      });
    });

    socket.on('call-reject', (data) => {
      const { callId } = data;
      io.to(`call:${callId}`).emit('call-rejected', { callId });
    });

    socket.on('call-end', (data) => {
      const { callId } = data;
      io.to(`call:${callId}`).emit('call-ended', { callId });
    });

    // Join chat room
    socket.on('join-chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    // Leave chat room
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);

      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Notify contacts
      socket.broadcast.emit('user-offline', { userId: socket.userId });
    });
  });
};

