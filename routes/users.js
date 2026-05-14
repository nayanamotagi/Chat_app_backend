import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: 'uploads/temp/' });

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -encryptionKey');
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile',
  authenticate,
  [
    body('displayName').optional().trim().isLength({ min: 1, max: 50 }),
    body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('bio').optional().trim().isLength({ max: 150 }),
    body('phoneNumber').optional().trim()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { displayName, username, bio, phoneNumber } = req.body;
      const user = await User.findById(req.user._id);

      if (displayName) user.displayName = displayName;
      if (username) {
        const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: user._id } });
        if (existing) throw new AppError('Username already taken', 400);
        user.username = username.toLowerCase();
      }
      if (bio !== undefined) user.bio = bio;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

      await user.save();

      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
);

// Upload profile photo
router.post('/profile-photo',
  authenticate,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const user = await User.findById(req.user._id);
      const uploadDir = path.join(__dirname, '../uploads/profiles');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `profile-${user._id}-${Date.now()}.jpg`;
      const filepath = path.join(uploadDir, filename);

      await sharp(req.file.path)
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(filepath);

      fs.unlinkSync(req.file.path);

      if (user.profilePhoto) {
        const oldPath = path.join(__dirname, '../uploads', user.profilePhoto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      user.profilePhoto = `profiles/${filename}`;
      await user.save();

      res.json({
        success: true,
        profilePhoto: user.profilePhoto
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update privacy settings
router.put('/privacy',
  authenticate,
  [
    body('lastSeen').optional().isIn(['everyone', 'contacts', 'nobody']),
    body('profilePhoto').optional().isIn(['everyone', 'contacts', 'nobody']),
    body('status').optional().isIn(['everyone', 'contacts', 'nobody'])
  ],
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (req.body.lastSeen) user.privacy.lastSeen = req.body.lastSeen;
      if (req.body.profilePhoto) user.privacy.profilePhoto = req.body.profilePhoto;
      if (req.body.status) user.privacy.status = req.body.status;
      await user.save();
      res.json({ success: true, privacy: user.privacy });
    } catch (error) {
      next(error);
    }
  }
);

// Search users
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({
      $or: [
        { displayName: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id },
      blockedUsers: { $ne: req.user._id }
    })
    .select('displayName username profilePhoto isOnline lastSeen')
    .limit(20);

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

// Block/Unblock user
router.post('/block/:userId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser) throw new AppError('User not found', 404);
    
    if (!user.blockedUsers.includes(targetUser._id)) {
      user.blockedUsers.push(targetUser._id);
    }
    
    await user.save();
    res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    next(error);
  }
});

router.post('/unblock/:userId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== req.params.userId);
    await user.save();
    res.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete('/account', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    // In production, implement proper data cleanup
    await User.findByIdAndDelete(user._id);
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;

