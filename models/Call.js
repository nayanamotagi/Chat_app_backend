import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  callType: {
    type: String,
    enum: ['one-to-one', 'group'],
    required: true
  },
  initiatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['calling', 'ringing', 'answered', 'rejected', 'missed', 'ended'],
      default: 'calling'
    },
    joinedAt: Date,
    leftAt: Date
  }],
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'answered', 'rejected', 'missed', 'ended'],
    default: 'initiated'
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

callSchema.index({ initiatorId: 1, createdAt: -1 });
callSchema.index({ 'participants.userId': 1 });

export default mongoose.model('Call', callSchema);

