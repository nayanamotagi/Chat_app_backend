import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 150,
    default: ''
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  privacy: {
    lastSeen: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    profilePhoto: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    },
    status: {
      type: String,
      enum: ['everyone', 'contacts', 'nobody'],
      default: 'everyone'
    }
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  encryptionKey: {
    type: String,
    required: true
  },
  publicKey: {
    type: String,
    required: true
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

// Only index phoneNumber since email and username already have unique: true (which creates indexes)
userSchema.index({ phoneNumber: 1 });

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    console.error('comparePassword: No password field on user');
    return false;
  }
  if (!candidatePassword) {
    console.error('comparePassword: No candidate password provided');
    return false;
  }
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('comparePassword error:', error);
    return false;
  }
};

userSchema.methods.setPassword = async function(password) {
  this.password = await bcrypt.hash(password, 12);
  return this;
};

export default mongoose.model('User', userSchema);

