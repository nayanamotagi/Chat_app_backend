import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location'],
    default: 'text'
  },
  content: {
    text: String,
    mediaUrl: String,
    thumbnailUrl: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    duration: Number,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isEncrypted: {
    type: Boolean,
    default: true
  },
  encryptedContent: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isStarred: {
    type: Map,
    of: Boolean,
    default: {}
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ 'readBy.userId': 1 });

export default mongoose.model('Message', messageSchema);

