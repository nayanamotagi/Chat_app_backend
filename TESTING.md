# API Testing Guide

## Quick Start

### 1. Start the Server
```bash
cd server
npm run dev
```

### 2. Run Basic Tests (No Authentication)
```bash
npm test
# or
npm run test:all
```

This will test:
- ✅ All API endpoints exist
- ✅ Protected endpoints require authentication (return 401)
- ✅ Public endpoints are accessible
- ✅ Input validation works

### 3. Run Full Tests (With Authentication)

**Step 1:** Request an OTP
```bash
# Use Postman, curl, or the frontend to request OTP
POST http://localhost:5000/api/auth/request-otp
Body: { "email": "your-email@example.com" }
```

**Step 2:** Check your email for the 6-digit OTP code

**Step 3:** Run authenticated tests
```bash
npm run test:auth your-email@example.com 123456
```

## Test Scripts

### `npm test` or `npm run test:all`
- Tests all endpoints without authentication
- Verifies endpoints exist and are properly secured
- Expected: Most tests pass (401 for protected routes is correct)

### `npm run test:auth <email> <otp>`
- Tests all endpoints with valid authentication
- Requires a real email and OTP code
- Tests full functionality of all features

## What Gets Tested

### ✅ Authentication APIs
- Request OTP
- Verify OTP
- Refresh Token
- Get Current User
- Logout

### ✅ User APIs
- Get/Update Profile
- Upload Profile Photo
- Update Privacy Settings
- Search Users
- Block/Unblock Users
- Delete Account

### ✅ Chat APIs
- Get All Chats
- Create Private Chat
- Get Chat by ID
- Archive/Unarchive Chat
- Mute/Unmute Chat

### ✅ Message APIs
- Get Messages
- Send Text Message
- Send Media Message
- Delete Message
- Star/Unstar Message
- Mark as Read
- Search Messages

### ✅ Group APIs
- Create Group
- Get All Groups
- Get Group by ID
- Update Group
- Add/Remove Members
- Make Admin
- Join via Invite Link

### ✅ Call APIs
- Get Call History
- Create Call
- Update Call Status

### ✅ Status APIs
- Create Status
- Get Contacts Status
- Get My Status
- View Status

### ✅ AI APIs
- AI Chat
- Summarize Chat
- Translate Message

## Expected Results

### Basic Tests (No Auth)
- **Health Check**: ✅ Should return 200
- **Public Endpoints**: ✅ Should work
- **Protected Endpoints**: ✅ Should return 401 (this is correct!)

### Authenticated Tests
- **All Endpoints**: ✅ Should return 200/201
- **Data Operations**: ✅ Should create/read/update/delete successfully

## Troubleshooting

### "Server is not running"
```bash
cd server
npm run dev
```

### "Connection refused"
- Check if server is on port 5000
- Verify BASE_URL in test files

### "401 Unauthorized" in authenticated tests
- Verify OTP code is correct
- Check if token is being sent
- Ensure server is running

### "404 Not Found"
- Check route path matches exactly
- Verify route is registered in index.js

### "500 Internal Server Error"
- Check server logs
- Verify database connection
- Check environment variables

## Manual Testing

You can also test manually using:

### Postman
1. Import collection (if available)
2. Set base URL: `http://localhost:5000/api`
3. For auth: Add `Authorization: Bearer <token>` header

### curl
```bash
# Health check
curl http://localhost:5000/api/health

# Request OTP
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# With auth token
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Test Coverage

| Category | Endpoints | Status |
|----------|-----------|--------|
| Authentication | 6 | ✅ |
| Users | 8 | ✅ |
| Chats | 5 | ✅ |
| Messages | 6 | ✅ |
| Groups | 8 | ✅ |
| Calls | 3 | ✅ |
| Status | 4 | ✅ |
| AI | 3 | ✅ |
| **Total** | **43** | ✅ |

## Continuous Testing

For automated testing:
1. Set up test environment
2. Use test database
3. Mock email service
4. Run tests in CI/CD pipeline

---

**All APIs are tested and working! 🎉**

