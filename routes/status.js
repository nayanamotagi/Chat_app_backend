import express from 'express';
import Status from '../models/Status.js';
import User from '../models/User.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
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

// Create status
router.post('/', authenticate, upload.single('media'), async (req, res, next) => {
  try {
    const { type, text } = req.body;

    if (type === 'text' && !text) {
      throw new AppError('Text content required', 400);
    }

    if (type !== 'text' && !req.file) {
      throw new AppError('Media file required', 400);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    let content = {};
    let mediaUrl = '';
    let thumbnailUrl = '';

    if (type === 'text') {
      content.text = text;
    } else {
      const uploadDir = path.join(__dirname, '../uploads/status');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `status-${Date.now()}-${req.file.originalname}`;
      const filepath = path.join(uploadDir, filename);

      if (type === 'image') {
        await sharp(req.file.path)
          .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(filepath);

        const thumbPath = path.join(uploadDir, `thumb-${filename}`);
        await sharp(req.file.path)
          .resize(200, 200, { fit: 'cover' })
          .jpeg({ quality: 70 })
          .toFile(thumbPath);
        thumbnailUrl = `status/thumb-${filename}`;
      } else {
        fs.renameSync(req.file.path, filepath);
      }

      mediaUrl = `status/${filename}`;
      content.mediaUrl = mediaUrl;
      content.thumbnailUrl = thumbnailUrl;
    }

    const status = await Status.create({
      userId: req.user._id,
      type,
      content,
      expiresAt
    });

    await status.populate('userId', 'displayName profilePhoto');

    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
});

// Get statuses from contacts
router.get('/contacts', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get all statuses from users who haven't blocked current user
    const statuses = await Status.find({
      userId: { $ne: req.user._id, $nin: user.blockedUsers },
      expiresAt: { $gt: new Date() }
    })
    .populate('userId', 'displayName profilePhoto')
    .sort({ createdAt: -1 })
    .lean();

    // Group by user
    const statusesByUser = {};
    statuses.forEach(status => {
      const userId = status.userId._id.toString();
      if (!statusesByUser[userId]) {
        statusesByUser[userId] = {
          user: status.userId,
          statuses: []
        };
      }
      statusesByUser[userId].statuses.push(status);
    });

    res.json({ success: true, statuses: Object.values(statusesByUser) });
  } catch (error) {
    next(error);
  }
});

// View status
router.post('/:statusId/view', authenticate, async (req, res, next) => {
  try {
    const status = await Status.findById(req.params.statusId);
    if (!status) throw new AppError('Status not found', 404);

    const hasViewed = status.views.some(v => v.userId.toString() === req.user._id.toString());
    if (!hasViewed) {
      status.views.push({ userId: req.user._id });
      await status.save();
    }

    res.json({ success: true, viewCount: status.views.length });
  } catch (error) {
    next(error);
  }
});

// Get my statuses
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const statuses = await Status.find({
      userId: req.user._id,
      expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 });

    res.json({ success: true, statuses });
  } catch (error) {
    next(error);
  }
});

export default router;

