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
let testEmail = null;
let testChatId = null;
let testGroupId = null;
let testMessageId = null;
let testUserId2 = null;

const results = {
  passed: 0,
  failed: 0,
  total: 0
};

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

async function runAuthenticatedTests() {
  console.log(`${colors.cyan}\n🧪 Starting Authenticated API Tests...\n${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Note: This test requires manual OTP verification${colors.reset}`);
  console.log(`${colors.yellow}   You need to provide a valid email and OTP code\n${colors.reset}`);

  // Get email and OTP from command line or use defaults
  const args = process.argv.slice(2);
  testEmail = args[0] || `test${Date.now()}@example.com`;
  const otpCode = args[1];

  if (!otpCode) {
    console.log(`${colors.yellow}Usage: node tests/api-test-authenticated.js <email> <otp-code>${colors.reset}`);
    console.log(`${colors.yellow}Example: node tests/api-test-authenticated.js test@example.com 123456${colors.reset}\n`);
    return;
  }

  // Step 1: Verify OTP and get token
  console.log(`${colors.blue}🔐 Step 1: Authentication${colors.reset}`);
  const verifyResult = await testAPI('Verify OTP', 'POST', '/auth/verify-otp', {
    email: testEmail,
    otp: otpCode,
    displayName: 'Test User'
  });

  if (!verifyResult.success || !verifyResult.data?.tokens) {
    console.log(`${colors.red}❌ Authentication failed. Cannot continue with authenticated tests.${colors.reset}`);
    console.log(`${colors.yellow}   Please verify your email and OTP code are correct.${colors.reset}\n`);
    return;
  }

  authToken = verifyResult.data.tokens.accessToken;
  refreshToken = verifyResult.data.tokens.refreshToken;
  userId = verifyResult.data.user?.id;
  
  console.log(`${colors.green}✅ Authenticated successfully!${colors.reset}\n`);

  // Step 2: Get current user
  console.log(`${colors.blue}👤 Step 2: User Profile${colors.reset}`);
  const meResult = await testAPI('Get Current User', 'GET', '/auth/me');
  if (meResult.success) {
    userId = meResult.data.user?._id || meResult.data.user?.id;
  }

  await testAPI('Get Profile', 'GET', '/users/profile');
  await testAPI('Update Profile', 'PUT', '/users/profile', {
    displayName: 'Updated Test User',
    bio: 'Test bio'
  });

  // Step 3: Search users
  console.log(`\n${colors.blue}🔍 Step 3: User Search${colors.reset}`);
  const searchResult = await testAPI('Search Users', 'GET', '/users/search?q=test');
  if (searchResult.success && searchResult.data.users?.length > 0) {
    testUserId2 = searchResult.data.users[0]._id;
  }

  // Step 4: Chats
  console.log(`\n${colors.blue}💬 Step 4: Chats${colors.reset}`);
  await testAPI('Get All Chats', 'GET', '/chats');
  
  if (testUserId2) {
    const chatResult = await testAPI('Create Private Chat', 'POST', `/chats/private/${testUserId2}`);
    if (chatResult.success) {
      testChatId = chatResult.data.chat?._id;
    }
  }

  if (testChatId) {
    await testAPI('Get Chat by ID', 'GET', `/chats/${testChatId}`);
    await testAPI('Archive Chat', 'POST', `/chats/${testChatId}/archive`);
    await testAPI('Unarchive Chat', 'POST', `/chats/${testChatId}/archive`);
    await testAPI('Mute Chat', 'POST', `/chats/${testChatId}/mute`);
  }

  // Step 5: Messages
  console.log(`\n${colors.blue}📨 Step 5: Messages${colors.reset}`);
  
  if (testChatId) {
    const messagesResult = await testAPI('Get Messages', 'GET', `/messages/${testChatId}`);
    
    const sendResult = await testAPI('Send Text Message', 'POST', `/messages/${testChatId}/text`, {
      text: 'Test message from API test'
    });
    
    if (sendResult.success) {
      testMessageId = sendResult.data.message?._id;
    }

    if (testMessageId) {
      await testAPI('Star Message', 'POST', `/messages/${testMessageId}/star`);
      await testAPI('Unstar Message', 'POST', `/messages/${testMessageId}/star`);
      await testAPI('Mark as Read', 'POST', `/messages/${testChatId}/read`);
      await testAPI('Search Messages', 'GET', `/messages/search/${testChatId}?q=test`);
    }
  }

  // Step 6: Groups
  console.log(`\n${colors.blue}👥 Step 6: Groups${colors.reset}`);
  
  const groupResult = await testAPI('Create Group', 'POST', '/groups', {
    name: 'Test Group',
    memberIds: testUserId2 ? [testUserId2] : []
  });
  
  if (groupResult.success) {
    testGroupId = groupResult.data.group?._id;
  }

  if (testGroupId) {
    await testAPI('Get All Groups', 'GET', '/groups');
    await testAPI('Get Group by ID', 'GET', `/groups/${testGroupId}`);
    await testAPI('Update Group', 'PUT', `/groups/${testGroupId}`, {
      name: 'Updated Test Group',
      description: 'Test description'
    });
  }

  // Step 7: Status
  console.log(`\n${colors.blue}📸 Step 7: Status${colors.reset}`);
  await testAPI('Get Contacts Status', 'GET', '/status/contacts');
  await testAPI('Get My Status', 'GET', '/status/me');
  await testAPI('Create Text Status', 'POST', '/status', {
    type: 'text',
    text: 'Test status message'
  });

  // Step 8: AI
  console.log(`\n${colors.blue}🤖 Step 8: AI Features${colors.reset}`);
  await testAPI('AI Chat', 'POST', '/ai/chat', {
    message: 'Hello, how are you?'
  });
  await testAPI('Summarize Chat', 'POST', '/ai/summarize', {
    messages: [
      { senderName: 'User1', text: 'Hello' },
      { senderName: 'User2', text: 'Hi there' }
    ]
  });
  await testAPI('Translate Message', 'POST', '/ai/translate', {
    text: 'Hello',
    targetLanguage: 'Spanish'
  });

  // Step 9: Refresh Token
  console.log(`\n${colors.blue}🔄 Step 9: Token Refresh${colors.reset}`);
  if (refreshToken) {
    await testAPI('Refresh Token', 'POST', '/auth/refresh-token', {
      refreshToken
    });
  }

  // Summary
  console.log(`\n${colors.cyan}📊 Test Summary${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  if (results.failed === 0) {
    console.log(`${colors.green}🎉 All authenticated tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Check the errors above.${colors.reset}\n`);
  }
}

runAuthenticatedTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

