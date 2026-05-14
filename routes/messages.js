import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { encryptMessage, decryptMessage, deriveSharedKey } from '../utils/encryption.js';
import User from '../models/User.js';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getSocketIO } from '../utils/socketHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: 'uploads/temp/' });

const router = express.Router();

// Get messages for a chat
router.get('/:chatId', authenticate, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id
    });

    if (!chat) throw new AppError('Chat not found', 404);

    const messages = await Message.find({
      chatId,
      isDeleted: false,
      deletedFor: { $ne: req.user._id }
    })
    .populate('senderId', 'displayName profilePhoto')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

    // Decrypt messages
    const user = await User.findById(req.user._id);
    const decryptedMessages = messages.map(msg => {
      if (msg.isEncrypted && msg.encryptedContent) {
        try {
          const otherParticipant = chat.participants.find(p => p.toString() !== req.user._id.toString());
          if (otherParticipant) {
            const otherUser = chat.participants.find(p => p.toString() === otherParticipant.toString());
            // Simplified: in production, use proper key exchange
          }
          // For now, return encrypted content - client will decrypt
        } catch (e) {
          console.error('Decryption error:', e);
        }
      }
      return msg;
    });

    res.json({
      success: true,
      messages: decryptedMessages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
});

// Send text message
router.post('/:chatId/text', authenticate, async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { text, replyTo } = req.body;

    if (!text || !text.trim()) {
      throw new AppError('Message text is required', 400);
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id
    });

    if (!chat) throw new AppError('Chat not found', 404);

    // Encrypt message
    const user = await User.findById(req.user._id);
    const { encrypted } = encryptMessage(text, user.encryptionKey);

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      type: 'text',
      content: { text },
      encryptedContent: encrypted,
      isEncrypted: true,
      replyTo,
      deliveredTo: [req.user._id]
    });

    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    
    // Increment unread for other participants
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const current = chat.unreadCount?.get(participantId.toString()) || 0;
        chat.unreadCount.set(participantId.toString(), current + 1);
      }
    });

    await chat.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'displayName profilePhoto')
      .populate('replyTo');

    // Emit socket event to notify all participants
    const io = getSocketIO();
    if (io) {
      io.to(`chat:${chatId}`).emit('new-message', {
        message: populatedMessage,
        chatId
      });

      // Update chat list for all participants
      chat.participants.forEach(participantId => {
        io.to(`user:${participantId}`).emit('chat-updated', {
          chatId,
          lastMessage: populatedMessage,
          lastMessageAt: chat.lastMessageAt
        });
      });
    }

    res.json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// Upload media message
router.post('/:chatId/media', authenticate, upload.single('media'), async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { type, replyTo } = req.body;

    if (!req.file) throw new AppError('No file uploaded', 400);

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id
    });

    if (!chat) throw new AppError('Chat not found', 404);

    const uploadDir = path.join(__dirname, '../uploads/media');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `media-${Date.now()}-${req.file.originalname}`;
    const filepath = path.join(uploadDir, filename);

    let thumbnailUrl = '';

    if (type === 'image') {
      await sharp(req.file.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(filepath);

      // Create thumbnail
      const thumbPath = path.join(uploadDir, `thumb-${filename}`);
      await sharp(req.file.path)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbPath);
      thumbnailUrl = `media/thumb-${filename}`;
    } else {
      fs.renameSync(req.file.path, filepath);
    }

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      type,
      content: {
        mediaUrl: `media/${filename}`,
        thumbnailUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      },
      replyTo,
      deliveredTo: [req.user._id]
    });

    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const current = chat.unreadCount?.get(participantId.toString()) || 0;
        chat.unreadCount.set(participantId.toString(), current + 1);
      }
    });

    await chat.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'displayName profilePhoto')
      .populate('replyTo');

    // Emit socket event to notify all participants
    const io = getSocketIO();
    if (io) {
      io.to(`chat:${chatId}`).emit('new-message', {
        message: populatedMessage,
        chatId
      });

      // Update chat list for all participants
      chat.participants.forEach(participantId => {
        io.to(`user:${participantId}`).emit('chat-updated', {
          chatId,
          lastMessage: populatedMessage,
          lastMessageAt: chat.lastMessageAt
        });
      });
    }

    res.json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:messageId', authenticate, async (req, res, next) => {
  try {
    const { deleteFor } = req.query;
    const message = await Message.findById(req.params.messageId);

    if (!message) throw new AppError('Message not found', 404);

    if (message.senderId.toString() !== req.user._id.toString()) {
      throw new AppError('Unauthorized', 403);
    }

    if (deleteFor === 'everyone') {
      message.isDeleted = true;
      message.deletedFor = message.chatId.participants || [];
    } else {
      message.deletedFor.push(req.user._id);
    }

    await message.save();
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
});

// Star/Unstar message
router.post('/:messageId/star', authenticate, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) throw new AppError('Message not found', 404);

    const isStarred = message.isStarred?.get(req.user._id.toString()) || false;
    message.isStarred.set(req.user._id.toString(), !isStarred);
    await message.save();

    res.json({ success: true, isStarred: !isStarred });
  } catch (error) {
    next(error);
  }
});

// Mark as read
router.post('/:chatId/read', authenticate, async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) throw new AppError('Chat not found', 404);

    await Message.updateMany(
      {
        chatId: chat._id,
        senderId: { $ne: req.user._id },
        'readBy.userId': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            userId: req.user._id,
            readAt: new Date()
          }
        }
      }
    );

    chat.unreadCount.set(req.user._id.toString(), 0);
    await chat.save();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Search messages
router.get('/search/:chatId', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, messages: [] });
    }

    const messages = await Message.find({
      chatId: req.params.chatId,
      'content.text': { $regex: q, $options: 'i' },
      isDeleted: false
    })
    .populate('senderId', 'displayName profilePhoto')
    .limit(50)
    .sort({ createdAt: -1 });

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
});

export default router;

