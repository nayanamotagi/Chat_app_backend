import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    required: true
  },
  content: {
    text: String,
    mediaUrl: String,
    thumbnailUrl: String
  },
  views: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

statusSchema.index({ userId: 1, expiresAt: -1 });
statusSchema.index({ expiresAt: 1 });

export default mongoose.model('Status', statusSchema);

