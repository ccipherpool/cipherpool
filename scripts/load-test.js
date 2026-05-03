#!/usr/bin/env node

/**
 * CipherPool Load Test Script
 * Simulates 10,000 concurrent users accessing the platform
 * 
 * Usage: node scripts/load-test.js
 */

import http from 'http';
import https from 'https';

// Configuration
const CONFIG = {
  TARGET_URL: process.env.TARGET_URL || 'https://cipherpool-4am91z7wq-ccipherpools-projects.vercel.app',
  TOTAL_USERS: 10000,
  RAMP_UP_TIME: 60, // seconds
  TEST_DURATION: 300, // seconds (5 minutes)
  REQUESTS_PER_USER: 5, // requests per user during test
};

// Metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  errors: {},
  startTime: Date.now(),
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(url, { method, timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        metrics.totalResponseTime += responseTime;
        metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
        metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);

        if (res.statusCode >= 200 && res.statusCode < 400) {
          metrics.successfulRequests++;
        } else {
          metrics.failedRequests++;
          metrics.errors[res.statusCode] = (metrics.errors[res.statusCode] || 0) + 1;
        }
        metrics.totalRequests++;
        resolve({ statusCode: res.statusCode, responseTime });
      });
    });

    req.on('error', (error) => {
      metrics.failedRequests++;
      metrics.errors[error.code] = (metrics.errors[error.code] || 0) + 1;
      metrics.totalRequests++;
      resolve({ error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      metrics.failedRequests++;
      metrics.errors['TIMEOUT'] = (metrics.errors['TIMEOUT'] || 0) + 1;
      metrics.totalRequests++;
      resolve({ error: 'TIMEOUT' });
    });

    req.end();
  });
}

// Simulate a single user
async function simulateUser(userId) {
  const endpoints = [
    '/',
    '/dashboard',
    '/tournaments',
    '/leaderboard',
    '/profile',
  ];

  for (let i = 0; i < CONFIG.REQUESTS_PER_USER; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = `${CONFIG.TARGET_URL}${endpoint}`;
    await makeRequest(url);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }
}

// Main load test function
async function runLoadTest() {
  console.log('🚀 CipherPool Load Test Started');
  console.log(`📊 Configuration:`);
  console.log(`   - Target URL: ${CONFIG.TARGET_URL}`);
  console.log(`   - Total Users: ${CONFIG.TOTAL_USERS.toLocaleString()}`);
  console.log(`   - Ramp-up Time: ${CONFIG.RAMP_UP_TIME}s`);
  console.log(`   - Test Duration: ${CONFIG.TEST_DURATION}s`);
  console.log(`   - Requests per User: ${CONFIG.REQUESTS_PER_USER}`);
  console.log('');

  const usersPerSecond = CONFIG.TOTAL_USERS / CONFIG.RAMP_UP_TIME;
  const testEndTime = Date.now() + CONFIG.TEST_DURATION * 1000;
  let activeUsers = 0;

  console.log('⏳ Ramping up users...');

  // Ramp-up phase
  for (let i = 0; i < CONFIG.TOTAL_USERS; i++) {
    if (Date.now() > testEndTime) break;

    // Spawn user
    simulateUser(i).catch(err => console.error(`User ${i} error:`, err));
    activeUsers++;

    // Print progress every 1000 users
    if ((i + 1) % 1000 === 0) {
      console.log(`✓ ${(i + 1).toLocaleString()} users spawned`);
    }

    // Delay to spread out user creation
    const delay = (1000 / usersPerSecond);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.log(`\n✓ All ${CONFIG.TOTAL_USERS.toLocaleString()} users spawned`);
  console.log('⏳ Running test for ' + CONFIG.TEST_DURATION + 's...\n');

  // Wait for test to complete
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION * 1000));

  // Print results
  printResults();
}

// Print test results
function printResults() {
  const elapsedTime = (Date.now() - metrics.startTime) / 1000;
  const avgResponseTime = metrics.totalRequests > 0 
    ? metrics.totalResponseTime / metrics.totalRequests 
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('📈 LOAD TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`\n⏱️  Test Duration: ${elapsedTime.toFixed(2)}s`);
  console.log(`\n📊 Request Statistics:`);
  console.log(`   Total Requests: ${metrics.totalRequests.toLocaleString()}`);
  console.log(`   Successful: ${metrics.successfulRequests.toLocaleString()} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`   Failed: ${metrics.failedRequests.toLocaleString()} (${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)}%)`);
  
  console.log(`\n⏱️  Response Time:`);
  console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   Min: ${metrics.minResponseTime.toFixed(2)}ms`);
  console.log(`   Max: ${metrics.maxResponseTime.toFixed(2)}ms`);
  
  console.log(`\n📉 Throughput:`);
  console.log(`   Requests/sec: ${(metrics.totalRequests / elapsedTime).toFixed(2)}`);
  
  if (Object.keys(metrics.errors).length > 0) {
    console.log(`\n❌ Errors:`);
    Object.entries(metrics.errors).forEach(([code, count]) => {
      console.log(`   ${code}: ${count}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  
  // Summary
  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  if (successRate >= 95) {
    console.log('✅ EXCELLENT: Success rate >= 95%');
  } else if (successRate >= 90) {
    console.log('⚠️  GOOD: Success rate >= 90%');
  } else if (successRate >= 80) {
    console.log('⚠️  ACCEPTABLE: Success rate >= 80%');
  } else {
    console.log('❌ POOR: Success rate < 80%');
  }

  console.log('='.repeat(60) + '\n');
}

// Run the test
runLoadTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
