/**
 * URL Validation Security Tests
 *
 * This file contains test cases to verify the URL validation
 * security measures are working correctly.
 *
 * Run these tests to ensure the validation catches all bypass attempts.
 */

import { validateRedirectUrl, isApprovedUrl } from './urlValidation';

// Test cases for URL validation
export const URL_VALIDATION_TEST_CASES = [
  // ✅ VALID CASES - Should PASS
  {
    description: 'Exact approved URL',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host/',
    shouldPass: true,
  },

  // ❌ INVALID CASES - Should FAIL

  // Protocol bypass attempts
  {
    description: 'HTTP instead of HTTPS',
    url: 'http://3rd-party-coatings-i-udgh.bolt.host/',
    shouldPass: false,
    expectedReason: 'Invalid protocol',
  },
  {
    description: 'FTP protocol',
    url: 'ftp://3rd-party-coatings-i-udgh.bolt.host/',
    shouldPass: false,
    expectedReason: 'Invalid protocol',
  },
  {
    description: 'javascript: protocol',
    url: 'javascript:alert("XSS")',
    shouldPass: false,
    expectedReason: 'Invalid URL format',
  },
  {
    description: 'data: URL',
    url: 'data:text/html,<script>alert("XSS")</script>',
    shouldPass: false,
    expectedReason: 'Invalid URL format',
  },

  // Domain bypass attempts
  {
    description: 'Different domain',
    url: 'https://evil.com/',
    shouldPass: false,
    expectedReason: 'Invalid hostname',
  },
  {
    description: 'Subdomain variation',
    url: 'https://malicious.3rd-party-coatings-i-udgh.bolt.host/',
    shouldPass: false,
    expectedReason: 'Invalid hostname',
  },
  {
    description: 'Parent domain',
    url: 'https://bolt.host/',
    shouldPass: false,
    expectedReason: 'Invalid hostname',
  },
  {
    description: 'Similar domain (typosquatting)',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host.evil.com/',
    shouldPass: false,
    expectedReason: 'Invalid hostname',
  },

  // Path traversal attempts
  {
    description: 'Path added',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host/admin',
    shouldPass: false,
    expectedReason: 'Invalid path',
  },
  {
    description: 'Path traversal',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host/../etc/passwd',
    shouldPass: false,
    expectedReason: 'Invalid path',
  },
  {
    description: 'Double slash path',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host//admin',
    shouldPass: false,
    expectedReason: 'Invalid path',
  },

  // Query parameter bypass attempts
  {
    description: 'Query parameters added',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host/?redirect=https://evil.com',
    shouldPass: false,
    expectedReason: 'Query parameters are not allowed',
  },
  {
    description: 'URL encoded query',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host/?%72%65%64%69%72%65%63%74=evil',
    shouldPass: false,
    expectedReason: 'Query parameters are not allowed',
  },

  // Fragment/hash bypass attempts
  {
    description: 'Hash fragment added',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host/#admin',
    shouldPass: false,
    expectedReason: 'URL fragments/hashes are not allowed',
  },

  // Port bypass attempts
  {
    description: 'Custom port',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host:8080/',
    shouldPass: false,
    expectedReason: 'Custom ports are not allowed',
  },
  {
    description: 'Port 80',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host:80/',
    shouldPass: false,
    expectedReason: 'Custom ports are not allowed',
  },

  // Credentials bypass attempts
  {
    description: 'Username in URL',
    url: 'https://admin@3rd-party-coatings-i-udgh.bolt.host/',
    shouldPass: false,
    expectedReason: 'Credentials in URL are not allowed',
  },
  {
    description: 'Username and password',
    url: 'https://admin:password@3rd-party-coatings-i-udgh.bolt.host/',
    shouldPass: false,
    expectedReason: 'Credentials in URL are not allowed',
  },

  // URL encoding bypass attempts
  {
    description: 'URL encoded domain',
    url: 'https://3rd-party-coatings-i-udgh%2ebolt%2ehost/',
    shouldPass: false,
    expectedReason: 'Invalid hostname',
  },
  {
    description: 'Mixed case (should fail - exact match)',
    url: 'https://3RD-PARTY-COATINGS-I-UDGH.BOLT.HOST/',
    shouldPass: false,
    expectedReason: 'Invalid hostname',
  },

  // Unicode/IDN bypass attempts
  {
    description: 'Unicode lookalike characters',
    url: 'https://3rd-pаrty-coatings-i-udgh.bolt.host/', // Contains Cyrillic 'а'
    shouldPass: false,
    expectedReason: 'Invalid hostname',
  },

  // Empty/null cases
  {
    description: 'Empty string',
    url: '',
    shouldPass: false,
    expectedReason: 'URL is required',
  },
  {
    description: 'Whitespace only',
    url: '   ',
    shouldPass: false,
    expectedReason: 'Invalid URL format',
  },

  // Open redirect attempts
  {
    description: 'Open redirect via path',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host/redirect?url=https://evil.com',
    shouldPass: false,
    expectedReason: 'Invalid path',
  },
  {
    description: 'Backslash separator',
    url: 'https://3rd-party-coatings-i-udgh.bolt.host\\@evil.com',
    shouldPass: false,
    expectedReason: 'Invalid URL format',
  },
];

/**
 * Run all validation tests
 * Call this function to verify all security checks are working
 */
export function runUrlValidationTests(): {
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; details?: string }>;
} {
  const results: Array<{ test: string; passed: boolean; details?: string }> = [];
  let passed = 0;
  let failed = 0;

  console.group('🔒 URL Validation Security Tests');

  URL_VALIDATION_TEST_CASES.forEach((testCase) => {
    const validation = validateRedirectUrl(testCase.url);
    const testPassed = validation.isValid === testCase.shouldPass;

    if (testPassed) {
      passed++;
      console.log(`✅ PASS: ${testCase.description}`);
      results.push({ test: testCase.description, passed: true });
    } else {
      failed++;
      console.error(`❌ FAIL: ${testCase.description}`);
      console.error(`   Expected: ${testCase.shouldPass ? 'VALID' : 'BLOCKED'}`);
      console.error(`   Got: ${validation.isValid ? 'VALID' : 'BLOCKED'}`);
      console.error(`   Reason: ${validation.reason}`);
      results.push({
        test: testCase.description,
        passed: false,
        details: `Expected ${testCase.shouldPass ? 'valid' : 'blocked'}, got ${validation.isValid ? 'valid' : 'blocked'}`,
      });
    }
  });

  console.groupEnd();
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${URL_VALIDATION_TEST_CASES.length} tests`);

  return { passed, failed, results };
}

/**
 * Quick test to verify the approved URL works
 */
export function testApprovedUrl(): boolean {
  const approved = 'https://3rd-party-coatings-i-udgh.bolt.host/';
  const result = isApprovedUrl(approved);
  console.log(`Testing approved URL: ${approved}`);
  console.log(`Result: ${result ? '✅ VALID' : '❌ INVALID'}`);
  return result;
}

// Export for use in browser console or test runners
if (typeof window !== 'undefined') {
  (window as any).runUrlValidationTests = runUrlValidationTests;
  (window as any).testApprovedUrl = testApprovedUrl;
  console.log('💡 URL Validation tests available:');
  console.log('   - Call runUrlValidationTests() to run all tests');
  console.log('   - Call testApprovedUrl() to test the approved URL');
}
