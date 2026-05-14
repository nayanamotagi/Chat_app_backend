import express from 'express';
import Group from '../models/Group.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

const router = express.Router();

// Create group
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;

    if (!name || name.trim().length < 1) {
      throw new AppError('Group name is required', 400);
    }

    const allMembers = [req.user._id, ...(memberIds || [])];
    const uniqueMembers = [...new Set(allMembers.map(id => id.toString()))];

    const chat = await Chat.create({
      type: 'group',
      participants: uniqueMembers
    });

    const inviteLink = crypto.randomBytes(32).toString('hex');

    const group = await Group.create({
      name: name.trim(),
      adminIds: [req.user._id],
      memberIds: uniqueMembers,
      chatId: chat._id,
      inviteLink
    });

    await group.populate('memberIds', 'displayName username profilePhoto');
    await group.populate('adminIds', 'displayName username profilePhoto');

    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// Get user's groups
router.get('/', authenticate, async (req, res, next) => {
  try {
    const groups = await Group.find({
      memberIds: req.user._id
    })
    .populate('memberIds', 'displayName username profilePhoto')
    .populate('adminIds', 'displayName username profilePhoto')
    .populate('chatId')
    .sort({ updatedAt: -1 });

    res.json({ success: true, groups });
  } catch (error) {
  next(error);
  }
});

// Get group by ID
router.get('/:groupId', authenticate, async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      memberIds: req.user._id
    })
    .populate('memberIds', 'displayName username profilePhoto isOnline')
    .populate('adminIds', 'displayName username profilePhoto')
    .populate('chatId');

    if (!group) throw new AppError('Group not found', 404);

    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// Update group
router.put('/:groupId', authenticate, async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      adminIds: req.user._id
    });

    if (!group) throw new AppError('Group not found or unauthorized', 404);

    if (req.body.name) group.name = req.body.name;
    if (req.body.description !== undefined) group.description = req.body.description;
    if (req.body.settings) group.settings = { ...group.settings, ...req.body.settings };

    await group.save();
    await group.populate('memberIds', 'displayName username profilePhoto');
    await group.populate('adminIds', 'displayName username profilePhoto');

    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// Add members
router.post('/:groupId/members', authenticate, async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId
    });

    if (!group) throw new AppError('Group not found', 404);

    const isAdmin = group.adminIds.some(id => id.toString() === req.user._id.toString());
    if (group.settings.onlyAdminsCanAddMembers && !isAdmin) {
      throw new AppError('Only admins can add members', 403);
    }

    const { memberIds } = req.body;
    const newMembers = memberIds.filter(id => !group.memberIds.includes(id));
    
    group.memberIds.push(...newMembers);
    await group.save();

    // Update chat participants
    const chat = await Chat.findById(group.chatId);
    chat.participants.push(...newMembers);
    await chat.save();

    await group.populate('memberIds', 'displayName username profilePhoto');

    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// Remove member
router.delete('/:groupId/members/:userId', authenticate, async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId
    });

    if (!group) throw new AppError('Group not found', 404);

    const isAdmin = group.adminIds.some(id => id.toString() === req.user._id.toString());
    const isRemovingSelf = req.params.userId === req.user._id.toString();

    if (!isAdmin && !isRemovingSelf) {
      throw new AppError('Unauthorized', 403);
    }

    group.memberIds = group.memberIds.filter(id => id.toString() !== req.params.userId);
    group.adminIds = group.adminIds.filter(id => id.toString() !== req.params.userId);

    await group.save();

    // Update chat participants
    const chat = await Chat.findById(group.chatId);
    chat.participants = chat.participants.filter(id => id.toString() !== req.params.userId);
    await chat.save();

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    next(error);
  }
});

// Make admin
router.post('/:groupId/admins/:userId', authenticate, async (req, res, next) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      adminIds: req.user._id
    });

    if (!group) throw new AppError('Group not found or unauthorized', 404);

    if (!group.memberIds.includes(req.params.userId)) {
      throw new AppError('User is not a member', 400);
    }

    if (!group.adminIds.includes(req.params.userId)) {
      group.adminIds.push(req.params.userId);
      await group.save();
    }

    res.json({ success: true, message: 'Admin added' });
  } catch (error) {
    next(error);
  }
});

// Join via invite link
router.post('/join/:inviteLink', authenticate, async (req, res, next) => {
  try {
    const group = await Group.findOne({ inviteLink: req.params.inviteLink });

    if (!group) throw new AppError('Invalid invite link', 404);

    if (group.memberIds.includes(req.user._id)) {
      return res.json({ success: true, group, message: 'Already a member' });
    }

    group.memberIds.push(req.user._id);
    await group.save();

    const chat = await Chat.findById(group.chatId);
    chat.participants.push(req.user._id);
    await chat.save();

    await group.populate('memberIds', 'displayName username profilePhoto');

    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

export default router;

