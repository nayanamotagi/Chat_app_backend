import express from 'express';
import Call from '../models/Call.js';
import Chat from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get call history
router.get('/', authenticate, async (req, res, next) => {
  try {
    const calls = await Call.find({
      $or: [
        { initiatorId: req.user._id },
        { 'participants.userId': req.user._id }
      ]
    })
    .populate('initiatorId', 'displayName profilePhoto')
    .populate('participants.userId', 'displayName profilePhoto')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({ success: true, calls });
  } catch (error) {
    next(error);
  }
});

// Create call
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, callType, chatId, groupId, participantIds } = req.body;

    let participants = [];
    if (callType === 'one-to-one') {
      if (!participantIds || participantIds.length !== 1) {
        throw new AppError('One participant required for one-to-one call', 400);
      }
      participants = [
        { userId: req.user._id, status: 'answered' },
        { userId: participantIds[0], status: 'calling' }
      ];
    } else {
      if (!groupId) throw new AppError('Group ID required for group call', 400);
      participants = participantIds.map(id => ({
        userId: id,
        status: id.toString() === req.user._id.toString() ? 'answered' : 'calling'
      }));
    }

    const call = await Call.create({
      type,
      callType,
      initiatorId: req.user._id,
      participants,
      chatId,
      groupId,
      status: 'initiated'
    });

    await call.populate('participants.userId', 'displayName profilePhoto');
    await call.populate('initiatorId', 'displayName profilePhoto');

    res.json({ success: true, call });
  } catch (error) {
    next(error);
  }
});

// Update call status
router.put('/:callId', authenticate, async (req, res, next) => {
  try {
    const { status, participantStatus } = req.body;
    const call = await Call.findById(req.params.callId);

    if (!call) throw new AppError('Call not found', 404);

    if (status) {
      call.status = status;
      if (status === 'answered') {
        call.startedAt = new Date();
      }
      if (status === 'ended') {
        call.endedAt = new Date();
        if (call.startedAt) {
          call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
        }
      }
    }

    if (participantStatus) {
      const participant = call.participants.find(
        p => p.userId.toString() === req.user._id.toString()
      );
      if (participant) {
        participant.status = participantStatus;
        if (participantStatus === 'answered') {
          participant.joinedAt = new Date();
        }
        if (participantStatus === 'ended') {
          participant.leftAt = new Date();
        }
      }
    }

    await call.save();
    await call.populate('participants.userId', 'displayName profilePhoto');

    res.json({ success: true, call });
  } catch (error) {
    next(error);
  }
});

export default router;

