import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let authToken = null;
let refreshToken = null;
let userId = null;
let testEmail = `test${Date.now()}@example.com`;
let testChatId = null;
let testGroupId = null;
let testMessageId = null;

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

// Helper function to make API calls
async function testAPI(name, method, endpoint, data = null, headers = {}, expectedStatus = 200) {
  results.total++;
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      data
    };

    if (authToken && !headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios(config);
    
    if (response.status === expectedStatus) {
      console.log(`${colors.green}✅ PASS${colors.reset} - ${name}`);
      results.passed++;
      return { success: true, data: response.data };
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset} - ${name} (Expected ${expectedStatus}, got ${response.status})`);
      results.failed++;
      return { success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    if (error.response && error.response.status === expectedStatus) {
      console.log(`${colors.green}✅ PASS${colors.reset} - ${name} (Expected error ${expectedStatus})`);
      results.passed++;
      return { success: true, data: error.response.data };
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset} - ${name}`);
      console.log(`${colors.red}   Error: ${error.response?.data?.error || error.message}${colors.reset}`);
      results.failed++;
      return { success: false, error: error.response?.data || error.message };
    }
  }
}

// Test file upload
async function testFileUpload(name, endpoint, filePath, fieldName = 'photo') {
  results.total++;
  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);
    formData.append(fieldName, fileStream);

    const response = await axios.post(`${BASE_URL}${endpoint}`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });

    console.log(`${colors.green}✅ PASS${colors.reset} - ${name}`);
    results.passed++;
    return { success: true, data: response.data };
  } catch (error) {
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${name}`);
    console.log(`${colors.red}   Error: ${error.response?.data?.error || error.message}${colors.reset}`);
    results.failed++;
    return { success: false, error: error.response?.data || error.message };
  }
}

// Main test function
async function runTests() {
  console.log(`${colors.cyan}\n🧪 Starting API Tests...\n${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // ==================== HEALTH CHECK ====================
  console.log(`${colors.blue}📋 Health Check${colors.reset}`);
  await testAPI('Health Check', 'GET', '/health');

  // ==================== AUTHENTICATION ====================
  console.log(`\n${colors.blue}🔐 Authentication Tests${colors.reset}`);
  
  // Request OTP
  const otpRequest = await testAPI('Request OTP', 'POST', '/auth/request-otp', {
    email: testEmail
  });
  
  if (otpRequest.success) {
    console.log(`${colors.yellow}⚠️  Note: Check email for OTP code. Using test OTP: 123456${colors.reset}`);
    
    // Verify OTP (using test OTP - in real scenario, get from email)
    const verifyOTP = await testAPI('Verify OTP', 'POST', '/auth/verify-otp', {
      email: testEmail,
      otp: '123456', // This will fail, but tests the endpoint
      displayName: 'Test User'
    }, {}, 400); // Expected to fail with invalid OTP
    
    // Try with a valid format (will still fail but tests validation)
    const verifyOTP2 = await testAPI('Verify OTP - Valid Format', 'POST', '/auth/verify-otp', {
      email: testEmail,
      otp: '000000',
      displayName: 'Test User'
    }, {}, 400);
  }

  // Refresh Token (will fail without valid token, but tests endpoint)
  await testAPI('Refresh Token - Invalid', 'POST', '/auth/refresh-token', {
    refreshToken: 'invalid-token'
  }, {}, 401);

  // Get Me (will fail without auth, but tests endpoint)
  await testAPI('Get Me - Unauthorized', 'GET', '/auth/me', null, {}, 401);

  // ==================== USERS ====================
  console.log(`\n${colors.blue}👤 User Tests${colors.reset}`);
  
  // Get Profile (requires auth)
  await testAPI('Get Profile - Unauthorized', 'GET', '/users/profile', null, {}, 401);
  
  // Update Profile (requires auth)
  await testAPI('Update Profile - Unauthorized', 'PUT', '/users/profile', {
    displayName: 'Updated Name'
  }, {}, 401);
  
  // Search Users (requires auth)
  await testAPI('Search Users - Unauthorized', 'GET', '/users/search?q=test', null, {}, 401);
  
  // Block User (requires auth)
  await testAPI('Block User - Unauthorized', 'POST', '/users/block/123', null, {}, 401);

  // ==================== CHATS ====================
  console.log(`\n${colors.blue}💬 Chat Tests${colors.reset}`);
  
  // Get Chats (requires auth)
  await testAPI('Get Chats - Unauthorized', 'GET', '/chats', null, {}, 401);
  
  // Create Private Chat (requires auth)
  await testAPI('Create Private Chat - Unauthorized', 'POST', '/chats/private/123', null, {}, 401);
  
  // Get Chat by ID (requires auth)
  await testAPI('Get Chat - Unauthorized', 'GET', '/chats/123', null, {}, 401);
  
  // Archive Chat (requires auth)
  await testAPI('Archive Chat - Unauthorized', 'POST', '/chats/123/archive', null, {}, 401);

  // ==================== MESSAGES ====================
  console.log(`\n${colors.blue}📨 Message Tests${colors.reset}`);
  
  // Get Messages (requires auth)
  await testAPI('Get Messages - Unauthorized', 'GET', '/messages/123', null, {}, 401);
  
  // Send Text Message (requires auth)
  await testAPI('Send Text Message - Unauthorized', 'POST', '/messages/123/text', {
    text: 'Test message'
  }, {}, 401);
  
  // Delete Message (requires auth)
  await testAPI('Delete Message - Unauthorized', 'DELETE', '/messages/123', null, {}, 401);
  
  // Star Message (requires auth)
  await testAPI('Star Message - Unauthorized', 'POST', '/messages/123/star', null, {}, 401);
  
  // Mark as Read (requires auth)
  await testAPI('Mark as Read - Unauthorized', 'POST', '/messages/123/read', null, {}, 401);
  
  // Search Messages (requires auth)
  await testAPI('Search Messages - Unauthorized', 'GET', '/messages/search/123?q=test', null, {}, 401);

  // ==================== GROUPS ====================
  console.log(`\n${colors.blue}👥 Group Tests${colors.reset}`);
  
  // Create Group (requires auth)
  await testAPI('Create Group - Unauthorized', 'POST', '/groups', {
    name: 'Test Group',
    memberIds: []
  }, {}, 401);
  
  // Get Groups (requires auth)
  await testAPI('Get Groups - Unauthorized', 'GET', '/groups', null, {}, 401);
  
  // Get Group by ID (requires auth)
  await testAPI('Get Group - Unauthorized', 'GET', '/groups/123', null, {}, 401);
  
  // Update Group (requires auth)
  await testAPI('Update Group - Unauthorized', 'PUT', '/groups/123', {
    name: 'Updated Group'
  }, {}, 401);
  
  // Add Members (requires auth)
  await testAPI('Add Members - Unauthorized', 'POST', '/groups/123/members', {
    memberIds: ['123']
  }, {}, 401);
  
  // Remove Member (requires auth)
  await testAPI('Remove Member - Unauthorized', 'DELETE', '/groups/123/members/456', null, {}, 401);
  
  // Join via Invite Link (requires auth)
  await testAPI('Join Group - Unauthorized', 'POST', '/groups/join/invalid-link', null, {}, 401);

  // ==================== CALLS ====================
  console.log(`\n${colors.blue}📞 Call Tests${colors.reset}`);
  
  // Get Call History (requires auth)
  await testAPI('Get Call History - Unauthorized', 'GET', '/calls', null, {}, 401);
  
  // Create Call (requires auth)
  await testAPI('Create Call - Unauthorized', 'POST', '/calls', {
    type: 'voice',
    callType: 'one-to-one',
    participantIds: ['123']
  }, {}, 401);
  
  // Update Call Status (requires auth)
  await testAPI('Update Call Status - Unauthorized', 'PUT', '/calls/123', {
    status: 'ended'
  }, {}, 401);

  // ==================== STATUS ====================
  console.log(`\n${colors.blue}📸 Status Tests${colors.reset}`);
  
  // Get Contacts Status (requires auth)
  await testAPI('Get Contacts Status - Unauthorized', 'GET', '/status/contacts', null, {}, 401);
  
  // Get My Status (requires auth)
  await testAPI('Get My Status - Unauthorized', 'GET', '/status/me', null, {}, 401);
  
  // View Status (requires auth)
  await testAPI('View Status - Unauthorized', 'POST', '/status/123/view', null, {}, 401);
  
  // Create Status (requires auth)
  await testAPI('Create Status - Unauthorized', 'POST', '/status', {
    type: 'text',
    text: 'Test status'
  }, {}, 401);

  // ==================== AI ====================
  console.log(`\n${colors.blue}🤖 AI Tests${colors.reset}`);
  
  // AI Chat (requires auth)
  await testAPI('AI Chat - Unauthorized', 'POST', '/ai/chat', {
    message: 'Hello'
  }, {}, 401);
  
  // Summarize Chat (requires auth)
  await testAPI('Summarize Chat - Unauthorized', 'POST', '/ai/summarize', {
    messages: []
  }, {}, 401);
  
  // Translate Message (requires auth)
  await testAPI('Translate Message - Unauthorized', 'POST', '/ai/translate', {
    text: 'Hello',
    targetLanguage: 'Spanish'
  }, {}, 401);

  // ==================== UPLOADS ====================
  console.log(`\n${colors.blue}📁 Upload Tests${colors.reset}`);
  
  // Test upload endpoint exists (will fail without file, but tests route)
  await testAPI('Upload Route - Check', 'GET', '/uploads/profiles', null, {}, 404);

  // ==================== VALIDATION TESTS ====================
  console.log(`\n${colors.blue}✅ Validation Tests${colors.reset}`);
  
  // Invalid email format
  await testAPI('Request OTP - Invalid Email', 'POST', '/auth/request-otp', {
    email: 'invalid-email'
  }, {}, 400);
  
  // Missing required fields
  await testAPI('Verify OTP - Missing Fields', 'POST', '/auth/verify-otp', {
    email: testEmail
  }, {}, 400);
  
  // Invalid OTP format
  await testAPI('Verify OTP - Invalid Format', 'POST', '/auth/verify-otp', {
    email: testEmail,
    otp: '123' // Too short
  }, {}, 400);

  // ==================== SUMMARY ====================
  console.log(`\n${colors.cyan}📊 Test Summary${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  if (results.failed === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. This is expected if you're not authenticated.${colors.reset}`);
    console.log(`${colors.yellow}   To test authenticated endpoints, you need to:${colors.reset}`);
    console.log(`${colors.yellow}   1. Request an OTP with a real email${colors.reset}`);
    console.log(`${colors.yellow}   2. Verify the OTP to get an auth token${colors.reset}`);
    console.log(`${colors.yellow}   3. Use the token in subsequent requests${colors.reset}\n`);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

