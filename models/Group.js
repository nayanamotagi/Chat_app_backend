import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  adminIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  inviteLink: {
    type: String,
    unique: true
  },
  inviteLinkExpiresAt: {
    type: Date
  },
  settings: {
    onlyAdminsCanMessage: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanAddMembers: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Only index memberIds since inviteLink already has unique: true (which creates an index)
groupSchema.index({ memberIds: 1 });

export default mongoose.model('Group', groupSchema);

