/**
 * Photo Embed Test Utility
 * Tests the complete photo-to-PDF pipeline
 */

import jsPDF from 'jspdf';
import { blobToDataURL } from './pinPhotoUtils';

/**
 * Test 1: Create a simple test image and embed it
 */
export async function testBasicImageEmbed(): Promise<boolean> {
  console.log('=== TEST 1: Basic Image Embed ===');

  try {
    // Create a simple 100x100 red square as a data URL
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('Failed to get canvas context');
      return false;
    }

    // Draw red square
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);

    // Add some text to verify it's rendering
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('TEST', 30, 55);

    const testDataURL = canvas.toDataURL('image/jpeg');
    console.log(`Test image data URL created: ${testDataURL.substring(0, 50)}...`);
    console.log(`Data URL length: ${testDataURL.length} characters`);

    // Create PDF and try to embed it
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Image Embed Test', 20, 20);

    // Try to add the image
    doc.addImage(testDataURL, 'JPEG', 20, 30, 100, 100);
    doc.text('If you see a red square above, embedding works!', 20, 140);

    // Save for manual inspection
    doc.save('embed-test.pdf');

    console.log('✅ Test PDF created successfully');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 2: Test blob to data URL conversion
 */
export async function testBlobConversion(): Promise<boolean> {
  console.log('=== TEST 2: Blob to Data URL Conversion ===');

  try {
    // Create a blob from a data URL
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const response = await fetch(testImageData);
    const blob = await response.blob();

    console.log(`Blob created: ${blob.size} bytes, type: ${blob.type}`);

    // Convert back to data URL
    const dataURL = await blobToDataURL(blob);

    console.log(`Data URL created: ${dataURL.substring(0, 50)}...`);
    console.log(`Length: ${dataURL.length} characters`);

    // Verify it starts correctly
    if (!dataURL.startsWith('data:image/')) {
      console.error('❌ Data URL has invalid format');
      return false;
    }

    console.log('✅ Blob conversion works correctly');
    return true;

  } catch (error) {
    console.error('❌ Blob conversion failed:', error);
    return false;
  }
}

/**
 * Test 3: Verify jsPDF version and capabilities
 */
export function testJsPDFVersion(): boolean {
  console.log('=== TEST 3: jsPDF Version Check ===');

  try {
    const doc = new jsPDF();

    // Check if addImage method exists
    if (typeof doc.addImage !== 'function') {
      console.error('❌ addImage method not available');
      return false;
    }

    console.log('✅ jsPDF initialized correctly');
    console.log('   addImage method: available');

    // Try to get version (may not be available in all builds)
    const version = (doc as any).version || (jsPDF as any).version || 'unknown';
    console.log(`   jsPDF version: ${version}`);

    return true;

  } catch (error) {
    console.error('❌ jsPDF check failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllPhotoTests(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Photo Embedding Diagnostic Tests     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  const results: Record<string, boolean> = {};

  // Test 1
  results['jsPDF Version'] = testJsPDFVersion();
  console.log('');

  // Test 2
  results['Blob Conversion'] = await testBlobConversion();
  console.log('');

  // Test 3
  results['Basic Image Embed'] = await testBasicImageEmbed();
  console.log('');

  // Summary
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Test Results Summary                  ║');
  console.log('╚════════════════════════════════════════╝');

  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
  }

  const allPassed = Object.values(results).every(r => r);

  console.log('');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('   Photo embedding infrastructure is working correctly.');
    console.log('   If photos still don\'t appear, the issue is with photo loading/storage.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('   Photo embedding has infrastructure issues.');
    console.log('   Check the failed tests above for details.');
  }
}
