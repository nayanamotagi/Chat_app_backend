import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all chats for user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      isArchived: { $ne: { [req.user._id]: true } }
    })
    .populate('participants', 'displayName username profilePhoto isOnline lastSeen')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .lean();

    const chatsWithUnread = chats.map(chat => {
      const unread = chat.unreadCount?.get(req.user._id.toString()) || 0;
      const otherParticipant = chat.participants.find(p => p._id.toString() !== req.user._id.toString());
      return {
        ...chat,
        unreadCount: unread,
        otherParticipant: chat.type === 'private' ? otherParticipant : null
      };
    });

    res.json({ success: true, chats: chatsWithUnread });
  } catch (error) {
    next(error);
  }
});

// Get or create private chat
router.post('/private/:userId', authenticate, async (req, res, next) => {
  try {
    const otherUserId = req.params.userId;
    
    if (otherUserId === req.user._id.toString()) {
      throw new AppError('Cannot create chat with yourself', 400);
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) throw new AppError('User not found', 404);

    // Check if blocked
    if (otherUser.blockedUsers.includes(req.user._id)) {
      throw new AppError('You are blocked by this user', 403);
    }

    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user._id, otherUserId] }
    })
    .populate('participants', 'displayName username profilePhoto isOnline lastSeen')
    .populate('lastMessage');

    if (!chat) {
      chat = await Chat.create({
        type: 'private',
        participants: [req.user._id, otherUserId]
      });
      await chat.populate('participants', 'displayName username profilePhoto isOnline lastSeen');
    }

    res.json({ success: true, chat });
  } catch (error) {
    next(error);
  }
});

// Get chat by ID
router.get('/:chatId', authenticate, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    })
    .populate('participants', 'displayName username profilePhoto isOnline lastSeen')
    .populate('lastMessage');

    if (!chat) throw new AppError('Chat not found', 404);

    // Reset unread count
    chat.unreadCount.set(req.user._id.toString(), 0);
    await chat.save();

    res.json({ success: true, chat });
  } catch (error) {
    next(error);
  }
});

// Archive/Unarchive chat
router.post('/:chatId/archive', authenticate, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    });

    if (!chat) throw new AppError('Chat not found', 404);

    const isArchived = chat.isArchived?.get(req.user._id.toString()) || false;
    chat.isArchived.set(req.user._id.toString(), !isArchived);
    await chat.save();

    res.json({ success: true, isArchived: !isArchived });
  } catch (error) {
    next(error);
  }
});

// Mute/Unmute chat
router.post('/:chatId/mute', authenticate, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user._id
    });

    if (!chat) throw new AppError('Chat not found', 404);

    const isMuted = chat.isMuted?.get(req.user._id.toString()) || false;
    chat.isMuted.set(req.user._id.toString(), !isMuted);
    await chat.save();

    res.json({ success: true, isMuted: !isMuted });
  } catch (error) {
    next(error);
  }
});

export default router;

