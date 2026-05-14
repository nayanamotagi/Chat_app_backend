import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://nayanamotagi24_db_user:lcXqeBrnGPzxFSEP@cluster0.tdi41ei.mongodb.net/chat_app

# JWT Secrets (Auto-generated)
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Client URL
CLIENT_URL=http://localhost:5173

# OpenAI API (for AI features - optional)
OPENAI_API_KEY=

# Email Configuration (for OTP - optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
`;

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('📝 JWT secrets have been auto-generated.');
} else {
  // Update only JWT secrets if they're missing
  const existingEnv = fs.readFileSync(envPath, 'utf8');
  let updatedEnv = existingEnv;
  
  if (!existingEnv.includes('JWT_SECRET=') || existingEnv.includes('JWT_SECRET=your-')) {
    updatedEnv = updatedEnv.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${jwtSecret}`);
  }
  
  if (!existingEnv.includes('JWT_REFRESH_SECRET=') || existingEnv.includes('JWT_REFRESH_SECRET=your-')) {
    updatedEnv = updatedEnv.replace(/JWT_REFRESH_SECRET=.*/g, `JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
  }
  
  if (updatedEnv !== existingEnv) {
    fs.writeFileSync(envPath, updatedEnv);
    console.log('✅ .env file updated with JWT secrets!');
  } else {
    console.log('✅ .env file already exists with JWT secrets.');
  }
}

