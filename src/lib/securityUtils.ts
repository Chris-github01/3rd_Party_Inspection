/**
 * Security Utilities
 * Provides validation, sanitization, and security functions
 */

/**
 * Validates and sanitizes storage paths to prevent path traversal attacks
 * @param path - The storage path to validate
 * @returns Sanitized path or null if invalid
 */
export function validateStoragePath(path: string | null | undefined): string | null {
  if (!path) return null;

  // Only allow alphanumeric, dash, underscore, period, and forward slash
  const validPattern = /^[a-zA-Z0-9\-_\/\.]+$/;

  // Check for path traversal attempts
  if (path.includes('..') || path.includes('\\')) {
    console.warn('Path traversal attempt detected:', path);
    return null;
  }

  // Validate pattern
  if (!validPattern.test(path)) {
    console.warn('Invalid characters in path:', path);
    return null;
  }

  // Additional security: limit path length
  if (path.length > 500) {
    console.warn('Path exceeds maximum length');
    return null;
  }

  return path;
}

/**
 * Safely constructs a Supabase storage URL with validation
 * @param baseUrl - Supabase URL
 * @param path - Storage path
 * @param bucket - Storage bucket name (default: 'documents')
 * @returns Safe URL or fallback URL
 */
export function buildSafeStorageUrl(
  baseUrl: string,
  path: string | null | undefined,
  bucket: string = 'documents'
): string {
  const fallbackUrl = '/placeholder-image.png';

  const validPath = validateStoragePath(path);
  if (!validPath) {
    return fallbackUrl;
  }

  // Encode URI components to prevent injection
  const encodedPath = encodeURIComponent(validPath).replace(/%2F/g, '/');

  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

/**
 * Validates user input for name fields
 * @param name - Name input to validate
 * @returns Validation result
 */
export function validateName(name: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2 || trimmed.length > 100) {
    return { valid: false, error: 'Name must be 2-100 characters' };
  }

  // Only allow letters, spaces, hyphens, apostrophes, and periods
  const validPattern = /^[a-zA-Z\s\-'\.]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  // HTML entity encoding for XSS prevention
  const sanitized = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return { valid: true, sanitized };
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 255) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true };
}

/**
 * Sanitizes CSV values to prevent formula injection
 * @param value - CSV cell value
 * @returns Sanitized value
 */
export function sanitizeCSVValue(value: string | null | undefined): string {
  if (!value) return '';

  let sanitized = value.toString().trim();

  // Prevent formula injection by escaping dangerous characters
  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaChars.includes(sanitized[0])) {
    sanitized = "'" + sanitized;  // Prefix with single quote
  }

  // Remove script-like content
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');  // Remove event handlers

  return sanitized;
}

/**
 * Validates file type for uploads
 * @param file - File to validate
 * @param allowedTypes - Allowed MIME types
 * @param allowedExtensions - Allowed file extensions
 * @param maxSize - Maximum file size in bytes
 * @returns Validation result
 */
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  allowedExtensions: string[],
  maxSize: number = 50 * 1024 * 1024  // 50MB default
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File exceeds maximum size of ${sizeMB}MB` };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop();

  if (!ext || !allowedExtensions.includes(`.${ext}`)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type'
    };
  }

  return { valid: true };
}

/**
 * Validates image file specifically
 * @param file - Image file to validate
 * @param maxSize - Maximum size in bytes
 * @returns Validation result
 */
export function validateImageFile(
  file: File,
  maxSize: number = 50 * 1024 * 1024
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  return validateFileUpload(file, allowedTypes, allowedExtensions, maxSize);
}

/**
 * Validates PDF file
 * @param file - PDF file to validate
 * @param maxSize - Maximum size in bytes
 * @returns Validation result
 */
export function validatePDFFile(
  file: File,
  maxSize: number = 100 * 1024 * 1024
): { valid: boolean; error?: string } {
  const allowedTypes = ['application/pdf'];
  const allowedExtensions = ['.pdf'];

  return validateFileUpload(file, allowedTypes, allowedExtensions, maxSize);
}

/**
 * Validates numeric input with range checking
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param allowNull - Whether null is allowed
 * @returns Validated number or null
 */
export function validateNumber(
  value: string | number | null | undefined,
  min: number,
  max: number,
  allowNull: boolean = true
): number | null {
  if (value === null || value === undefined || value === '') {
    return allowNull ? null : min;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return allowNull ? null : min;
  }

  if (num < min || num > max) {
    console.warn(`Number ${num} out of valid range [${min}, ${max}]`);
    return allowNull ? null : min;
  }

  return num;
}

/**
 * Validates FRR (Fire Resistance Rating) minutes
 * @param value - FRR value to validate
 * @returns Validated FRR or null
 */
export function validateFRRMinutes(value: string | number | null | undefined): number | null {
  return validateNumber(value, 0, 1000, true);
}

/**
 * Validates DFT (Dry Film Thickness) in microns
 * @param value - DFT value to validate
 * @returns Validated DFT or null
 */
export function validateDFTMicrons(value: string | number | null | undefined): number | null {
  return validateNumber(value, 0, 10000, true);
}

/**
 * Validates thickness in millimeters
 * @param value - Thickness value to validate
 * @returns Validated thickness or null
 */
export function validateThicknessMM(value: string | number | null | undefined): number | null {
  return validateNumber(value, 0, 1000, true);
}

/**
 * Generates secure random filename
 * @param extension - File extension (without dot)
 * @returns Secure random filename
 */
export function generateSecureFileName(extension: string): string {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  const randomStr = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  return `${randomStr}.${extension}`;
}

/**
 * Gets user-friendly error message without exposing system details
 * @param error - Error object
 * @param fallback - Fallback message
 * @returns Safe error message
 */
export function getSafeErrorMessage(error: any, fallback: string = 'An error occurred'): string {
  // In development, show more details
  if (import.meta.env.DEV && error?.message) {
    return error.message;
  }

  // In production, show generic messages
  if (error?.message?.toLowerCase().includes('password')) {
    return 'Invalid credentials. Please try again.';
  }

  if (error?.message?.toLowerCase().includes('email')) {
    return 'Invalid credentials. Please try again.';
  }

  if (error?.message?.toLowerCase().includes('network')) {
    return 'Network error. Please check your connection.';
  }

  if (error?.message?.toLowerCase().includes('permission')) {
    return 'You do not have permission to perform this action.';
  }

  return fallback;
}

/**
 * Verifies PDF file signature (magic bytes)
 * @param file - File to verify
 * @returns True if valid PDF
 */
export async function verifyPDFSignature(file: File): Promise<boolean> {
  const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46];  // %PDF

  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    return PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
  } catch {
    return false;
  }
}
