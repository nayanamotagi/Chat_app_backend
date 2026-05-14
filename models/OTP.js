import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  code: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for email and expiresAt, and TTL index for expiresAt
// Compound index for email and expiresAt queries
otpSchema.index({ email: 1, expiresAt: 1 });
// TTL index for automatic expiration (MongoDB will use this for cleanup)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.methods.compareCode = async function(candidateCode) {
  return await bcrypt.compare(candidateCode, this.code);
};

export default mongoose.model('OTP', otpSchema);

