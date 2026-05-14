import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import OTP from '../models/OTP.js';
import { AppError } from '../middleware/errorHandler.js';

export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const createOTP = async (email) => {
  const code = generateOTP();
  const hashedCode = await bcrypt.hash(code, 10);
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRE_MINUTES || 10));

  // Delete old OTPs for this email
  await OTP.deleteMany({ email, isUsed: false });

  const otp = await OTP.create({
    email,
    code: hashedCode,
    expiresAt
  });

  return { code, otpId: otp._id };
};

export const verifyOTP = async (email, code) => {
  const otp = await OTP.findOne({
    email: email.toLowerCase(),
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  if (otp.attempts >= 5) {
    throw new AppError('Too many OTP attempts. Please request a new OTP', 429);
  }

  const isValid = await otp.compareCode(code);
  
  if (!isValid) {
    otp.attempts += 1;
    await otp.save();
    throw new AppError('Invalid OTP code', 400);
  }

  otp.isUsed = true;
  await otp.save();

  return true;
};

