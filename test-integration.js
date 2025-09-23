/**
 * Integration Tests for Messaging App
 * Runs comprehensive tests against the deployed services
 */

const http = require('http');
const { promisify } = require('util');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost';
const TIMEOUT = 10000;

// Test data storage
const testData = {
  user1: null,
  user2: null,
  token1: null,
  token2: null,
  messageId: null,
  chatId: null,
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, TIMEOUT);

    const req = http.request(options, (res) => {
      clearTimeout(timeout);
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log(`${colors.blue}Testing health endpoints...${colors.reset}`);

  const services = [
    { name: 'Nginx Gateway', path: '/health' },
    { name: 'Auth Service', path: '/health/auth' },
    { name: 'User Service', path: '/health/users' },
    { name: 'Messaging Service', path: '/health/messaging' },
    { name: 'Real-time Service', path: '/health/realtime' },
  ];

  for (const service of services) {
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 80,
        path: service.path,
        method: 'GET',
      });

      if (response.statusCode === 200) {
        console.log(`  ${colors.green}✓${colors.reset} ${service.name} is healthy`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${service.name} returned status ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} ${service.name} is unreachable: ${error.message}`);
      return false;
    }
  }

  return true;
}

async function testUserRegistration() {
  console.log(`\n${colors.blue}Testing user registration...${colors.reset}`);

  const timestamp = Date.now();

  // Sample RSA public key for testing (you would generate real keys in production)
  const samplePublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArdlWZNH8WxAcyV9+gS/b
40/P7su6vTDhOxYSYJHFJYBWUqQxxpeV7bA4mda1grZ/uq6e05h4rfbsMLx664Um
wtWNh9CP1IOVtctBr7L4E6dJPEJOqs7dUlV+aT9AjzeRAac0htxfF6ISp8lorpJ4
lo9/n1D6vpSUZUGScXl1zWt9NNZxZRYitIwoFKJN9A2N3H7FqoLHQLI5lvZ8atRb
I6Ii3MeEaNH+9RjHxJOBCEwy8dNzZCRach49C8y/yN1aaQ6OIZeHGr4ybjnm0ykq
Mou+Q0N36LT4DldldAfp6QxTbt+z2+QRUy2tfKZ8n1v5PPBkGcry1JWf8htN4vDi
/QIDAQAB
-----END PUBLIC KEY-----`;

  testData.user1 = {
    username: `testuser1_${timestamp}`,
    password: 'Test123@Pass',
    email: `testuser1_${timestamp}@test.com`,
    publicKey: samplePublicKey,
  };

  testData.user2 = {
    username: `testuser2_${timestamp}`,
    password: 'Test123@Pass',
    email: `testuser2_${timestamp}@test.com`,
    publicKey: samplePublicKey,
  };

  // Register user 1
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, testData.user1);

    if (response.statusCode === 201) {
      console.log(`  ${colors.green}✓${colors.reset} User 1 registered successfully`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} User 1 registration failed: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} User 1 registration error: ${error.message}`);
    return false;
  }

  // Register user 2
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, testData.user2);

    if (response.statusCode === 201) {
      console.log(`  ${colors.green}✓${colors.reset} User 2 registered successfully`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} User 2 registration failed: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} User 2 registration error: ${error.message}`);
    return false;
  }

  return true;
}

async function testUserLogin() {
  console.log(`\n${colors.blue}Testing user login...${colors.reset}`);

  // Login user 1
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      username: testData.user1.username,
      password: testData.user1.password,
    });

    if (response.statusCode === 200 && response.body.data && response.body.data.token) {
      testData.token1 = response.body.data.token;
      console.log(`  ${colors.green}✓${colors.reset} User 1 logged in successfully`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} User 1 login failed: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} User 1 login error: ${error.message}`);
    return false;
  }

  // Login user 2
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, {
      username: testData.user2.username,
      password: testData.user2.password,
    });

    if (response.statusCode === 200 && response.body.data && response.body.data.token) {
      testData.token2 = response.body.data.token;
      console.log(`  ${colors.green}✓${colors.reset} User 2 logged in successfully`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} User 2 login failed: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} User 2 login error: ${error.message}`);
    return false;
  }

  return true;
}

async function testMessaging() {
  console.log(`\n${colors.blue}Testing messaging functionality...${colors.reset}`);

  // Send a message from user 1 to user 2
  const messageContent = `Test message at ${new Date().toISOString()}`;
  // Generate a UUID v4
  const clientMessageId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/messages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testData.token1}`,
        'Content-Type': 'application/json',
      },
    }, {
      receiverUsername: testData.user2.username,
      encryptedText: messageContent,
      clientMessageId: clientMessageId,
    });

    if (response.statusCode === 201 && response.body.data && response.body.data.id) {
      testData.messageId = response.body.data.id;
      console.log(`  ${colors.green}✓${colors.reset} Message sent successfully (ID: ${testData.messageId})`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Failed to send message: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Error sending message: ${error.message}`);
    return false;
  }

  // Test idempotency
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/messages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testData.token1}`,
        'Content-Type': 'application/json',
      },
    }, {
      receiverUsername: testData.user2.username,
      encryptedText: messageContent,
      clientMessageId: clientMessageId,
    });

    if (response.statusCode === 200 && response.body.data && response.body.data.id === testData.messageId) {
      console.log(`  ${colors.green}✓${colors.reset} Idempotency check passed`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Idempotency check returned unexpected result`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Error testing idempotency: ${error.message}`);
    return false;
  }

  return true;
}

async function testChatRetrieval() {
  console.log(`\n${colors.blue}Testing chat retrieval...${colors.reset}`);

  // Get chats for user 1
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/chats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.token1}`,
      },
    });

    if (response.statusCode === 200 && response.body.data && response.body.data.length > 0) {
      console.log(`  ${colors.green}✓${colors.reset} Retrieved ${response.body.data.length} chat(s)`);
      // Get the chatId from the first chat
      testData.chatId = response.body.data[0].chatId;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Failed to retrieve chats: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Error retrieving chats: ${error.message}`);
    return false;
  }

  // Get messages in specific chat
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: `/chats/${testData.chatId}/messages?limit=10&offset=0`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testData.token1}`,
      },
    });

    if (response.statusCode === 200 && response.body.data && Array.isArray(response.body.data)) {
      console.log(`  ${colors.green}✓${colors.reset} Retrieved ${response.body.data.length} message(s) from chat`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Failed to retrieve messages: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Error retrieving messages: ${error.message}`);
    return false;
  }

  return true;
}

async function testMessageStatusUpdate() {
  console.log(`\n${colors.blue}Testing message status updates...${colors.reset}`);

  // Update to delivered
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: `/messages/${testData.messageId}/status`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${testData.token2}`,
        'Content-Type': 'application/json',
      },
    }, {
      status: 'delivered',
    });

    if (response.statusCode === 200) {
      console.log(`  ${colors.green}✓${colors.reset} Message status updated to 'delivered'`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Failed to update message status: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Error updating message status: ${error.message}`);
    return false;
  }

  // Update to read
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: `/messages/${testData.messageId}/status`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${testData.token2}`,
        'Content-Type': 'application/json',
      },
    }, {
      status: 'read',
    });

    if (response.statusCode === 200) {
      console.log(`  ${colors.green}✓${colors.reset} Message status updated to 'read'`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Failed to update message status: ${JSON.stringify(response.body)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Error updating message status: ${error.message}`);
    return false;
  }

  return true;
}

async function testSecurity() {
  console.log(`\n${colors.blue}Testing security...${colors.reset}`);

  // Test invalid token
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/chats',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid_token',
      },
    });

    if (response.statusCode === 401 || response.statusCode === 403) {
      console.log(`  ${colors.green}✓${colors.reset} Invalid token correctly rejected`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Invalid token not rejected properly`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Security test error: ${error.message}`);
    return false;
  }

  // Test duplicate username
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 80,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, testData.user1);

    if (response.statusCode === 400 || response.statusCode === 409) {
      console.log(`  ${colors.green}✓${colors.reset} Duplicate username correctly rejected`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Duplicate username not rejected properly`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Security test error: ${error.message}`);
    return false;
  }

  return true;
}

// Main test runner
async function runTests() {
  console.log(`${colors.bright}${colors.blue}🧪 Messaging App Integration Tests${colors.reset}`);
  console.log(`${colors.bright}========================================${colors.reset}\n`);

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Messaging', fn: testMessaging },
    { name: 'Chat Retrieval', fn: testChatRetrieval },
    { name: 'Message Status Update', fn: testMessageStatusUpdate },
    { name: 'Security', fn: testSecurity },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        console.log(`${colors.red}✗ ${test.name} test failed${colors.reset}`);
      }
    } catch (error) {
      failed++;
      console.log(`${colors.red}✗ ${test.name} test error: ${error.message}${colors.reset}`);
    }
  }

  console.log(`\n${colors.bright}========================================${colors.reset}`);
  console.log(`${colors.bright}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ All integration tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ Some integration tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Wait for services to be ready
async function waitForServices(retries = 30) {
  console.log(`${colors.yellow}Waiting for services to be ready...${colors.reset}`);

  for (let i = 0; i < retries; i++) {
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 80,
        path: '/health',
        method: 'GET',
      });

      if (response.statusCode === 200) {
        console.log(`${colors.green}Services are ready!${colors.reset}\n`);
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`${colors.red}Services did not become ready in time${colors.reset}`);
  return false;
}

// Run the tests
(async () => {
  const servicesReady = await waitForServices();
  if (servicesReady) {
    await runTests();
  } else {
    console.log(`${colors.red}Cannot run tests - services are not available${colors.reset}`);
    process.exit(1);
  }
})();