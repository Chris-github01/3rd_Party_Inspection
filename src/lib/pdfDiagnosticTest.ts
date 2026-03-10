/**
 * PDF Photo Export Diagnostic Test
 * Run this in browser console to diagnose photo export issues
 */

import { supabase } from './supabase';
import { getPinPhotosWithBlobs, getPhotoDataURL } from './pinPhotoUtils';
import jsPDF from 'jspdf';

export interface DiagnosticResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

/**
 * Test 1: Check jsPDF version and functionality
 */
async function testJsPDFSetup(): Promise<DiagnosticResult> {
  try {
    const doc = new jsPDF();

    // Check addImage exists
    if (typeof doc.addImage !== 'function') {
      return {
        step: 'jsPDF Setup',
        status: 'fail',
        message: 'addImage method not available',
        details: { available_methods: Object.keys(doc).filter(k => typeof (doc as any)[k] === 'function') }
      };
    }

    // Try to add a test image
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    doc.addImage(testImage, 'PNG', 10, 10, 50, 50);

    return {
      step: 'jsPDF Setup',
      status: 'pass',
      message: 'jsPDF initialized correctly and can embed images',
      details: { version: (jsPDF as any).version || 'unknown' }
    };
  } catch (error) {
    return {
      step: 'jsPDF Setup',
      status: 'fail',
      message: `jsPDF error: ${error}`,
      details: { error }
    };
  }
}

/**
 * Test 2: Check database access to pin_photos
 */
async function testDatabaseAccess(projectId: string): Promise<DiagnosticResult> {
  try {
    // Get pins for project
    const { data: pins, error: pinsError } = await supabase
      .from('drawing_pins')
      .select('pin_id, pin_number')
      .eq('project_id', projectId)
      .limit(5);

    if (pinsError) throw pinsError;
    if (!pins || pins.length === 0) {
      return {
        step: 'Database Access',
        status: 'warning',
        message: 'No pins found in project',
        details: { projectId }
      };
    }

    // Check for photos
    const { data: photos, error: photosError } = await supabase
      .from('pin_photos')
      .select('id, pin_id, file_name, file_path')
      .in('pin_id', pins.map(p => p.pin_id));

    if (photosError) throw photosError;

    return {
      step: 'Database Access',
      status: photos && photos.length > 0 ? 'pass' : 'warning',
      message: `Found ${pins.length} pins, ${photos?.length || 0} photos`,
      details: {
        pins: pins.length,
        photos: photos?.length || 0,
        sample_pin: pins[0],
        sample_photo: photos?.[0]
      }
    };
  } catch (error) {
    return {
      step: 'Database Access',
      status: 'fail',
      message: `Database error: ${error}`,
      details: { error }
    };
  }
}

/**
 * Test 3: Check Storage access and signed URLs
 */
async function testStorageAccess(pinId: string): Promise<DiagnosticResult> {
  try {
    // Get a photo record
    const { data: photos, error: photosError } = await supabase
      .from('pin_photos')
      .select('*')
      .eq('pin_id', pinId)
      .limit(1);

    if (photosError) throw photosError;
    if (!photos || photos.length === 0) {
      return {
        step: 'Storage Access',
        status: 'warning',
        message: 'No photos found for this pin',
        details: { pinId }
      };
    }

    const photo = photos[0];

    // Try to create signed URL
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('pin-photos')
      .createSignedUrl(photo.file_path, 60);

    if (urlError) throw urlError;
    if (!urlData?.signedUrl) {
      return {
        step: 'Storage Access',
        status: 'fail',
        message: 'Failed to create signed URL',
        details: { photo }
      };
    }

    // Try to download the file
    const response = await fetch(urlData.signedUrl);
    if (!response.ok) {
      return {
        step: 'Storage Access',
        status: 'fail',
        message: `HTTP ${response.status}: ${response.statusText}`,
        details: { url: urlData.signedUrl, status: response.status }
      };
    }

    const blob = await response.blob();

    return {
      step: 'Storage Access',
      status: 'pass',
      message: `Successfully downloaded photo: ${blob.size} bytes`,
      details: {
        file_name: photo.file_name,
        file_size: blob.size,
        content_type: blob.type,
        signed_url_created: true
      }
    };
  } catch (error) {
    return {
      step: 'Storage Access',
      status: 'fail',
      message: `Storage error: ${error}`,
      details: { error }
    };
  }
}

/**
 * Test 4: Check photo loading with blobs
 */
async function testPhotoLoading(pinId: string): Promise<DiagnosticResult> {
  try {
    console.log(`Testing photo loading for pin: ${pinId}`);

    const photos = await getPinPhotosWithBlobs(pinId);

    if (photos.length === 0) {
      return {
        step: 'Photo Loading',
        status: 'warning',
        message: 'No photos loaded (but may be expected)',
        details: { pinId }
      };
    }

    // Check if blobs are present
    const photosWithBlobs = photos.filter(p => p.blob);
    const photosWithoutBlobs = photos.filter(p => !p.blob);

    if (photosWithoutBlobs.length > 0) {
      return {
        step: 'Photo Loading',
        status: 'warning',
        message: `${photosWithBlobs.length}/${photos.length} photos loaded with blobs`,
        details: {
          total: photos.length,
          with_blobs: photosWithBlobs.length,
          without_blobs: photosWithoutBlobs.length,
          failed_photos: photosWithoutBlobs.map(p => p.file_name)
        }
      };
    }

    return {
      step: 'Photo Loading',
      status: 'pass',
      message: `All ${photos.length} photos loaded successfully`,
      details: {
        photos: photos.map(p => ({
          file_name: p.file_name,
          blob_size: p.blob?.size,
          blob_type: p.blob?.type
        }))
      }
    };
  } catch (error) {
    return {
      step: 'Photo Loading',
      status: 'fail',
      message: `Photo loading error: ${error}`,
      details: { error }
    };
  }
}

/**
 * Test 5: Check blob to data URL conversion
 */
async function testDataURLConversion(pinId: string): Promise<DiagnosticResult> {
  try {
    const photos = await getPinPhotosWithBlobs(pinId);

    if (photos.length === 0) {
      return {
        step: 'Data URL Conversion',
        status: 'warning',
        message: 'No photos to convert',
        details: { pinId }
      };
    }

    const photo = photos[0];
    const dataURL = await getPhotoDataURL(photo);

    if (!dataURL) {
      return {
        step: 'Data URL Conversion',
        status: 'fail',
        message: 'Failed to create data URL',
        details: { photo: photo.file_name }
      };
    }

    // Validate data URL format
    if (!dataURL.startsWith('data:image/')) {
      return {
        step: 'Data URL Conversion',
        status: 'fail',
        message: 'Invalid data URL format',
        details: {
          format: dataURL.substring(0, 50),
          expected: 'data:image/jpeg;base64,...'
        }
      };
    }

    return {
      step: 'Data URL Conversion',
      status: 'pass',
      message: `Data URL created successfully (${dataURL.length} chars)`,
      details: {
        file_name: photo.file_name,
        format: dataURL.substring(0, 30),
        size: dataURL.length,
        is_jpeg: dataURL.startsWith('data:image/jpeg'),
        is_png: dataURL.startsWith('data:image/png')
      }
    };
  } catch (error) {
    return {
      step: 'Data URL Conversion',
      status: 'fail',
      message: `Conversion error: ${error}`,
      details: { error }
    };
  }
}

/**
 * Test 6: Full PDF generation test
 */
async function testPDFGeneration(pinId: string): Promise<DiagnosticResult> {
  try {
    const photos = await getPinPhotosWithBlobs(pinId);

    if (photos.length === 0) {
      return {
        step: 'PDF Generation',
        status: 'warning',
        message: 'No photos to add to PDF',
        details: { pinId }
      };
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Photo Embedding Test', 20, 20);

    let yPos = 40;
    let successCount = 0;
    let failCount = 0;

    for (const photo of photos) {
      try {
        const dataURL = await getPhotoDataURL(photo);

        if (dataURL) {
          // Detect format
          let format = 'JPEG';
          if (dataURL.startsWith('data:image/png')) format = 'PNG';

          // Add to PDF
          doc.addImage(dataURL, format, 20, yPos, 80, 60);
          doc.setFontSize(8);
          doc.text(photo.file_name, 20, yPos + 65);

          successCount++;
          yPos += 75;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to add photo ${photo.file_name}:`, error);
        failCount++;
      }
    }

    if (failCount === 0) {
      return {
        step: 'PDF Generation',
        status: 'pass',
        message: `Successfully embedded ${successCount} photos in test PDF`,
        details: {
          total_photos: photos.length,
          embedded: successCount,
          failed: failCount
        }
      };
    } else {
      return {
        step: 'PDF Generation',
        status: 'warning',
        message: `Embedded ${successCount}/${photos.length} photos`,
        details: {
          total_photos: photos.length,
          embedded: successCount,
          failed: failCount
        }
      };
    }
  } catch (error) {
    return {
      step: 'PDF Generation',
      status: 'fail',
      message: `PDF generation error: ${error}`,
      details: { error }
    };
  }
}

/**
 * Run all diagnostic tests
 */
export async function runPhotoDiagnostics(projectId: string, pinId?: string): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   PDF Photo Export Diagnostic Suite              ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  const results: DiagnosticResult[] = [];

  // Test 1: jsPDF
  console.log('Running Test 1: jsPDF Setup...');
  results.push(await testJsPDFSetup());

  // Test 2: Database
  console.log('Running Test 2: Database Access...');
  results.push(await testDatabaseAccess(projectId));

  // Get a pin ID for further tests
  let testPinId = pinId;
  if (!testPinId) {
    const { data: pins } = await supabase
      .from('drawing_pins')
      .select('pin_id')
      .eq('project_id', projectId)
      .limit(1);

    if (pins && pins.length > 0) {
      testPinId = pins[0].pin_id;
    }
  }

  if (testPinId) {
    // Test 3: Storage
    console.log('Running Test 3: Storage Access...');
    results.push(await testStorageAccess(testPinId));

    // Test 4: Photo Loading
    console.log('Running Test 4: Photo Loading...');
    results.push(await testPhotoLoading(testPinId));

    // Test 5: Data URL
    console.log('Running Test 5: Data URL Conversion...');
    results.push(await testDataURLConversion(testPinId));

    // Test 6: PDF Generation
    console.log('Running Test 6: PDF Generation...');
    results.push(await testPDFGeneration(testPinId));
  } else {
    console.warn('⚠ No pins found - skipping storage and photo tests');
  }

  // Print results
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Test Results                                    ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.step}: ${result.message}`);
    if (result.details) {
      console.log('   Details:', result.details);
    }
    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log('═══════════════════════════════════════════════════');
  console.log(`Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('');
    console.log('❌ FAILURES DETECTED');
    console.log('Review the failed tests above and check:');
    console.log('  1. RLS policies on pin_photos and storage bucket');
    console.log('  2. Photo files exist in Supabase Storage');
    console.log('  3. Network connectivity');
    console.log('  4. Browser console for detailed error messages');
  } else if (warnings > 0) {
    console.log('');
    console.log('⚠️ WARNINGS PRESENT');
    console.log('System is working but some issues detected.');
    console.log('Review warnings above for details.');
  } else {
    console.log('');
    console.log('✅ ALL TESTS PASSED');
    console.log('Photo export system is working correctly!');
  }

  return;
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).runPhotoDiagnostics = runPhotoDiagnostics;
}
