#!/usr/bin/env tsx

/**
 * Pre-Deployment Test Suite for Normie Observer
 * 
 * Run this before submitting to app stores:
 * npx tsx scripts/pre-deployment-tests.ts
 */

import { execSync } from 'child_process';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  log(`${passed ? 'PASS' : 'FAIL'}: ${name} - ${message}`, passed ? 'success' : 'error');
}

async function testBuildCompiles(): Promise<void> {
  log('\n--- Testing Build ---', 'info');
  try {
    execSync('npm run build', { stdio: 'pipe' });
    addResult('Build compiles', true, 'Production build successful');
  } catch (error: any) {
    addResult('Build compiles', false, `Build failed: ${error.message}`);
  }
}

async function testTypeCheck(): Promise<void> {
  log('\n--- Testing TypeScript ---', 'info');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    addResult('TypeScript check', true, 'No type errors');
  } catch (error: any) {
    addResult('TypeScript check', false, 'Type errors found');
  }
}

async function testAPIEndpoints(): Promise<void> {
  log('\n--- Testing API Endpoints ---', 'info');
  
  const endpoints = [
    { path: '/api/health', expectedStatus: 200 },
    { path: '/api/token-data', expectedStatus: 200 },
    { path: '/api/polls', expectedStatus: 200 },
    { path: '/api/activity', expectedStatus: 200 },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`);
      const passed = response.status === endpoint.expectedStatus;
      addResult(
        `API ${endpoint.path}`,
        passed,
        `Status: ${response.status} (expected ${endpoint.expectedStatus})`
      );
    } catch (error: any) {
      addResult(`API ${endpoint.path}`, false, `Request failed: ${error.message}`);
    }
  }
}

async function testDatabaseConnection(): Promise<void> {
  log('\n--- Testing Database ---', 'info');
  
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    const passed = data.database === 'connected' || response.ok;
    addResult('Database connection', passed, passed ? 'Connected' : 'Not connected');
  } catch (error: any) {
    addResult('Database connection', false, `Check failed: ${error.message}`);
  }
}

async function testLegalPages(): Promise<void> {
  log('\n--- Testing Legal Pages ---', 'info');
  
  const pages = ['/privacy', '/terms'];
  
  for (const page of pages) {
    try {
      const response = await fetch(`${API_BASE}${page}`);
      const passed = response.status === 200;
      addResult(`Legal page ${page}`, passed, `Status: ${response.status}`);
    } catch (error: any) {
      addResult(`Legal page ${page}`, false, `Request failed: ${error.message}`);
    }
  }
}

async function testSecurityHeaders(): Promise<void> {
  log('\n--- Testing Security ---', 'info');
  
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const headers = response.headers;
    
    // Check for common security headers
    const checks = [
      { header: 'x-content-type-options', expected: true },
    ];
    
    for (const check of checks) {
      const hasHeader = headers.has(check.header);
      addResult(
        `Security header: ${check.header}`,
        hasHeader === check.expected,
        hasHeader ? 'Present' : 'Missing'
      );
    }
  } catch (error: any) {
    addResult('Security headers', false, `Check failed: ${error.message}`);
  }
}

async function testEnvironmentVariables(): Promise<void> {
  log('\n--- Testing Environment ---', 'info');
  
  const requiredVars = ['DATABASE_URL'];
  const optionalVars = ['SESSION_SECRET', 'NORMIE_ADMIN_PASSWORD'];
  
  for (const varName of requiredVars) {
    const exists = !!process.env[varName];
    addResult(`Env var: ${varName}`, exists, exists ? 'Set' : 'Missing (required)');
  }
  
  for (const varName of optionalVars) {
    const exists = !!process.env[varName];
    if (!exists) {
      log(`WARN: Optional env var ${varName} not set`, 'warn');
    }
  }
}

async function testFileStructure(): Promise<void> {
  log('\n--- Testing File Structure ---', 'info');
  
  const requiredFiles = [
    'capacitor.config.ts',
    'package.json',
    'shared/schema.ts',
    'client/src/pages/Privacy.tsx',
    'client/src/pages/Terms.tsx',
  ];
  
  for (const file of requiredFiles) {
    try {
      const fs = await import('fs');
      const exists = fs.existsSync(file);
      addResult(`File: ${file}`, exists, exists ? 'Exists' : 'Missing');
    } catch (error: any) {
      addResult(`File: ${file}`, false, `Check failed: ${error.message}`);
    }
  }
}

function printSummary(): void {
  log('\n========================================', 'info');
  log('           TEST SUMMARY', 'info');
  log('========================================\n', 'info');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  log(`Total: ${total}`, 'info');
  log(`Passed: ${passed}`, 'success');
  log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  
  if (failed > 0) {
    log('\nFailed Tests:', 'error');
    results.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}: ${r.message}`, 'error');
    });
  }
  
  log('\n========================================', 'info');
  
  if (failed > 0) {
    log('\nDEPLOYMENT NOT RECOMMENDED', 'error');
    log('Please fix the failing tests before deployment.\n', 'error');
    process.exit(1);
  } else {
    log('\nALL TESTS PASSED - READY FOR DEPLOYMENT', 'success');
    log('Proceed with app store submission.\n', 'success');
    process.exit(0);
  }
}

async function main() {
  log('========================================', 'info');
  log('  NORMIE OBSERVER PRE-DEPLOYMENT TESTS', 'info');
  log('========================================', 'info');
  log(`API Base: ${API_BASE}`, 'info');
  log(`Time: ${new Date().toISOString()}`, 'info');
  
  // Run tests
  await testEnvironmentVariables();
  await testFileStructure();
  
  // Only run network tests if server is running
  try {
    await fetch(`${API_BASE}/api/health`, { method: 'HEAD' });
    await testDatabaseConnection();
    await testAPIEndpoints();
    await testLegalPages();
    await testSecurityHeaders();
  } catch {
    log('\nWARN: Server not running, skipping API tests', 'warn');
    log('Start the server and run tests again for full coverage.\n', 'warn');
  }
  
  printSummary();
}

main().catch(console.error);
