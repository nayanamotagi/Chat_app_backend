# API Testing Guide

This directory contains test scripts to verify all API endpoints are working correctly.

## Test Files

### 1. `api-test.js` - Basic API Tests (No Authentication Required)

Tests all API endpoints for:
- Route existence
- Authentication requirements
- Input validation
- Error handling

**Run:**
```bash
npm test
# or
node tests/api-test.js
```

**What it tests:**
- ✅ Health check endpoint
- ✅ Authentication endpoints (request OTP, verify OTP)
- ✅ All protected endpoints (should return 401 without auth)
- ✅ Input validation (invalid emails, missing fields, etc.)
- ✅ Error handling

**Expected Results:**
- Most tests should pass (testing that endpoints exist and require auth)
- Some tests will fail (expected) when testing with invalid data
- This is normal - it confirms your API is properly secured

### 2. `api-test-authenticated.js` - Full API Tests (Requires Authentication)

Tests all API endpoints with valid authentication:
- User profile management
- Chat creation and management
- Message sending and management
- Group creation and management
- Status creation
- AI features
- Token refresh

**Run:**
```bash
# First, get an OTP for your email
# Then run:
node tests/api-test-authenticated.js <your-email> <otp-code>

# Example:
node tests/api-test-authenticated.js test@example.com 123456
```

**Steps:**
1. Start your server: `npm run dev`
2. Request an OTP for your email (use Postman or the frontend)
3. Check your email for the 6-digit OTP code
4. Run the test script with your email and OTP

**What it tests:**
- ✅ Full authentication flow
- ✅ User profile operations
- ✅ Chat operations (create, get, archive, mute)
- ✅ Message operations (send, star, delete, search)
- ✅ Group operations (create, update, manage members)
- ✅ Status operations
- ✅ AI features
- ✅ Token refresh

## Test Coverage

### Authentication APIs
- [x] POST /api/auth/request-otp
- [x] POST /api/auth/verify-otp
- [x] POST /api/auth/set-password
- [x] POST /api/auth/refresh-token
- [x] POST /api/auth/logout
- [x] GET /api/auth/me

### User APIs
- [x] GET /api/users/profile
- [x] PUT /api/users/profile
- [x] POST /api/users/profile-photo
- [x] PUT /api/users/privacy
- [x] GET /api/users/search
- [x] POST /api/users/block/:userId
- [x] POST /api/users/unblock/:userId
- [x] DELETE /api/users/account

### Chat APIs
- [x] GET /api/chats
- [x] POST /api/chats/private/:userId
- [x] GET /api/chats/:chatId
- [x] POST /api/chats/:chatId/archive
- [x] POST /api/chats/:chatId/mute

### Message APIs
- [x] GET /api/messages/:chatId
- [x] POST /api/messages/:chatId/text
- [x] POST /api/messages/:chatId/media
- [x] DELETE /api/messages/:messageId
- [x] POST /api/messages/:messageId/star
- [x] POST /api/messages/:chatId/read
- [x] GET /api/messages/search/:chatId

### Group APIs
- [x] POST /api/groups
- [x] GET /api/groups
- [x] GET /api/groups/:groupId
- [x] PUT /api/groups/:groupId
- [x] POST /api/groups/:groupId/members
- [x] DELETE /api/groups/:groupId/members/:userId
- [x] POST /api/groups/:groupId/admins/:userId
- [x] POST /api/groups/join/:inviteLink

### Call APIs
- [x] GET /api/calls
- [x] POST /api/calls
- [x] PUT /api/calls/:callId

### Status APIs
- [x] POST /api/status
- [x] GET /api/status/contacts
- [x] GET /api/status/me
- [x] POST /api/status/:statusId/view

### AI APIs
- [x] POST /api/ai/chat
- [x] POST /api/ai/summarize
- [x] POST /api/ai/translate

### Upload APIs
- [x] GET /api/uploads/profiles
- [x] GET /api/uploads/media
- [x] GET /api/uploads/status

## Running Tests

### Prerequisites
1. Server must be running on `http://localhost:5000`
2. MongoDB must be connected
3. For authenticated tests, you need a valid email and OTP

### Quick Test (Basic)
```bash
npm test
```

### Full Test (Authenticated)
```bash
# 1. Start server
npm run dev

# 2. In another terminal, request OTP (use Postman or frontend)
# POST http://localhost:5000/api/auth/request-otp
# Body: { "email": "your-email@example.com" }

# 3. Check email for OTP code

# 4. Run authenticated tests
node tests/api-test-authenticated.js your-email@example.com 123456
```

## Understanding Test Results

### ✅ PASS
- Endpoint exists and responds correctly
- Authentication is working
- Validation is working

### ❌ FAIL
- Could mean:
  - Endpoint doesn't exist (check route)
  - Server not running
  - Database connection issue
  - Authentication token expired
  - Invalid test data

### Expected Failures
Some failures are expected:
- Testing invalid OTP codes (should fail)
- Testing without authentication (should return 401)
- Testing with invalid data (should return 400)

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"
- Make sure server is running: `npm run dev`
- Check if server is on port 5000
- Verify BASE_URL in test file

### "401 Unauthorized" in authenticated tests
- Check if OTP is correct
- Verify token is being sent in headers
- Check if token expired

### "404 Not Found"
- Verify route exists in server
- Check route path matches exactly
- Ensure server is running

### "500 Internal Server Error"
- Check server logs for errors
- Verify database connection
- Check environment variables

## Manual Testing with Postman

You can also test APIs manually using Postman:

1. Import the API collection (if available)
2. Set base URL: `http://localhost:5000/api`
3. For authenticated endpoints:
   - First request OTP
   - Verify OTP to get token
   - Add token to Authorization header: `Bearer <token>`

## Continuous Testing

For CI/CD, you can:
1. Set up test environment
2. Use test database
3. Mock email service
4. Run tests automatically on deploy

---

**Happy Testing! 🧪**

