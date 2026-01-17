#!/usr/bin/env node

/**
 * Automated Backend API Tests
 * Run with: node tests/api-tests/test-backend.js
 */

const API_BASE_URL = 'http://localhost:3001';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(name, testFn) {
    try {
        log(`\n🧪 Testing: ${name}`, 'cyan');
        await testFn();
        log(`✅ PASS: ${name}`, 'green');
        return true;
    } catch (error) {
        log(`❌ FAIL: ${name}`, 'red');
        log(`   Error: ${error.message}`, 'red');
        return false;
    }
}

// Test Suite
async function runTests() {
    log('\n╔════════════════════════════════════════════╗', 'blue');
    log('║     Backend API Test Suite                ║', 'blue');
    log('╚════════════════════════════════════════════╝', 'blue');
    
    let passed = 0;
    let failed = 0;

    // Test 1: Health Check
    if (await test('Health Endpoint', async () => {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.status !== 'healthy') throw new Error('Status not healthy');
        log(`   Version: ${data.version}`, 'yellow');
    })) passed++; else failed++;

    // Test 2: Material Prices
    if (await test('Material Prices API', async () => {
        const response = await fetch(`${API_BASE_URL}/api/materials`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.materials) throw new Error('No materials returned');
        log(`   Materials loaded: ${Object.keys(data.materials).length}`, 'yellow');
    })) passed++; else failed++;

    // Test 3: Similar Parts
    if (await test('Similar Parts API', async () => {
        const response = await fetch(`${API_BASE_URL}/api/similar-parts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                volume: 100,
                surfaceArea: 400,
                material: 'Aluminum 6061-T6',
                estimatedCost: 75.00
            })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.similarParts || data.similarParts.length === 0) {
            throw new Error('No similar parts returned');
        }
        log(`   Similar parts found: ${data.similarParts.length}`, 'yellow');
    })) passed++; else failed++;

    // Test 4: Invalid File Upload
    if (await test('File Upload Validation', async () => {
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('file', Buffer.from('test'), {
            filename: 'invalid.txt',
            contentType: 'text/plain'
        });

        const response = await fetch(`${API_BASE_URL}/api/process-cad`, {
            method: 'POST',
            body: formData
        });
        
        // Should reject invalid file type
        if (response.ok) throw new Error('Invalid file was not rejected');
        log('   Invalid file correctly rejected', 'yellow');
    })) passed++; else failed++;

    // Results
    log('\n╔════════════════════════════════════════════╗', 'blue');
    log('║     Test Results                           ║', 'blue');
    log('╚════════════════════════════════════════════╝', 'blue');
    log(`✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, 'red');
    log(`📊 Total: ${passed + failed}`, 'cyan');
    
    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    log(`\n❌ Test suite crashed: ${error.message}`, 'red');
    process.exit(1);
});
