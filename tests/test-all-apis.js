import axios from 'axios';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/api/health`);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Test all API endpoints
async function testAllAPIs() {
  console.log(`${colors.cyan}🧪 API Endpoint Test Suite${colors.reset}\n`);
  
  // Check if server is running
  console.log(`${colors.blue}Checking server connection...${colors.reset}`);
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log(`${colors.red}❌ Server is not running!${colors.reset}`);
    console.log(`${colors.yellow}Please start the server first:${colors.reset}`);
    console.log(`${colors.yellow}  cd server${colors.reset}`);
    console.log(`${colors.yellow}  npm run dev${colors.reset}\n`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Server is running${colors.reset}\n`);
  
  const endpoints = [
    // Health Check
    { method: 'GET', path: '/health', name: 'Health Check', auth: false },
    
    // Authentication
    { method: 'POST', path: '/auth/request-otp', name: 'Request OTP', auth: false, body: { email: 'test@example.com' } },
    { method: 'POST', path: '/auth/verify-otp', name: 'Verify OTP', auth: false, body: { email: 'test@example.com', otp: '123456' }, expectedStatus: 400 },
    { method: 'POST', path: '/auth/refresh-token', name: 'Refresh Token', auth: false, body: { refreshToken: 'invalid' }, expectedStatus: 401 },
    { method: 'GET', path: '/auth/me', name: 'Get Current User', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/auth/logout', name: 'Logout', auth: true, expectedStatus: 401 },
    
    // Users
    { method: 'GET', path: '/users/profile', name: 'Get Profile', auth: true, expectedStatus: 401 },
    { method: 'PUT', path: '/users/profile', name: 'Update Profile', auth: true, body: { displayName: 'Test' }, expectedStatus: 401 },
    { method: 'GET', path: '/users/search?q=test', name: 'Search Users', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/users/block/123', name: 'Block User', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/users/unblock/123', name: 'Unblock User', auth: true, expectedStatus: 401 },
    { method: 'DELETE', path: '/users/account', name: 'Delete Account', auth: true, expectedStatus: 401 },
    
    // Chats
    { method: 'GET', path: '/chats', name: 'Get All Chats', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/chats/private/123', name: 'Create Private Chat', auth: true, expectedStatus: 401 },
    { method: 'GET', path: '/chats/123', name: 'Get Chat by ID', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/chats/123/archive', name: 'Archive Chat', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/chats/123/mute', name: 'Mute Chat', auth: true, expectedStatus: 401 },
    
    // Messages
    { method: 'GET', path: '/messages/123', name: 'Get Messages', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/messages/123/text', name: 'Send Text Message', auth: true, body: { text: 'Test' }, expectedStatus: 401 },
    { method: 'DELETE', path: '/messages/123', name: 'Delete Message', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/messages/123/star', name: 'Star Message', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/messages/123/read', name: 'Mark as Read', auth: true, expectedStatus: 401 },
    { method: 'GET', path: '/messages/search/123?q=test', name: 'Search Messages', auth: true, expectedStatus: 401 },
    
    // Groups
    { method: 'POST', path: '/groups', name: 'Create Group', auth: true, body: { name: 'Test Group' }, expectedStatus: 401 },
    { method: 'GET', path: '/groups', name: 'Get All Groups', auth: true, expectedStatus: 401 },
    { method: 'GET', path: '/groups/123', name: 'Get Group by ID', auth: true, expectedStatus: 401 },
    { method: 'PUT', path: '/groups/123', name: 'Update Group', auth: true, body: { name: 'Updated' }, expectedStatus: 401 },
    { method: 'POST', path: '/groups/123/members', name: 'Add Members', auth: true, body: { memberIds: [] }, expectedStatus: 401 },
    { method: 'DELETE', path: '/groups/123/members/456', name: 'Remove Member', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/groups/123/admins/456', name: 'Make Admin', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/groups/join/invalid', name: 'Join Group', auth: true, expectedStatus: 401 },
    
    // Calls
    { method: 'GET', path: '/calls', name: 'Get Call History', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/calls', name: 'Create Call', auth: true, body: { type: 'voice', callType: 'one-to-one' }, expectedStatus: 401 },
    { method: 'PUT', path: '/calls/123', name: 'Update Call Status', auth: true, body: { status: 'ended' }, expectedStatus: 401 },
    
    // Status
    { method: 'GET', path: '/status/contacts', name: 'Get Contacts Status', auth: true, expectedStatus: 401 },
    { method: 'GET', path: '/status/me', name: 'Get My Status', auth: true, expectedStatus: 401 },
    { method: 'POST', path: '/status', name: 'Create Status', auth: true, body: { type: 'text', text: 'Test' }, expectedStatus: 401 },
    { method: 'POST', path: '/status/123/view', name: 'View Status', auth: true, expectedStatus: 401 },
    
    // AI
    { method: 'POST', path: '/ai/chat', name: 'AI Chat', auth: true, body: { message: 'Hello' }, expectedStatus: 401 },
    { method: 'POST', path: '/ai/summarize', name: 'Summarize Chat', auth: true, body: { messages: [] }, expectedStatus: 401 },
    { method: 'POST', path: '/ai/translate', name: 'Translate Message', auth: true, body: { text: 'Hello', targetLanguage: 'Spanish' }, expectedStatus: 401 },
  ];
  
  const results = { passed: 0, failed: 0, total: 0 };
  
  for (const endpoint of endpoints) {
    results.total++;
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (endpoint.body) {
        config.data = endpoint.body;
      }
      
      const expectedStatus = endpoint.expectedStatus || (endpoint.auth ? 401 : 200);
      
      try {
        const response = await axios(config);
        if (response.status === expectedStatus) {
          console.log(`${colors.green}✅${colors.reset} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} ${endpoint.name}`);
          results.passed++;
        } else {
          console.log(`${colors.red}❌${colors.reset} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} ${endpoint.name} (Expected ${expectedStatus}, got ${response.status})`);
          results.failed++;
        }
      } catch (error) {
        if (error.response && error.response.status === expectedStatus) {
          console.log(`${colors.green}✅${colors.reset} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} ${endpoint.name}`);
          results.passed++;
        } else {
          console.log(`${colors.red}❌${colors.reset} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} ${endpoint.name} (${error.response?.status || 'Error'})`);
          results.failed++;
        }
      }
    } catch (error) {
      console.log(`${colors.red}❌${colors.reset} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} ${endpoint.name} (${error.message})`);
      results.failed++;
    }
  }
  
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Total Endpoints: ${results.total}`);
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  if (results.failed === 0) {
    console.log(`${colors.green}🎉 All API endpoints are accessible!${colors.reset}\n`);
    console.log(`${colors.yellow}Note: 401 errors are expected for protected endpoints without authentication.${colors.reset}`);
    console.log(`${colors.yellow}This confirms your API security is working correctly.${colors.reset}\n`);
  } else if (results.passed / results.total > 0.8) {
    console.log(`${colors.green}✅ Most endpoints are working correctly!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  Some endpoints may need attention.${colors.reset}\n`);
  }
}

testAllAPIs().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

