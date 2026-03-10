/**
 * URL Validation and Redirect Security
 *
 * This module provides strict URL validation to ensure that external redirects
 * only go to the approved third-party coatings domain.
 *
 * Security Features:
 * - Exact URL matching
 * - Protocol enforcement (HTTPS only)
 * - Domain/subdomain validation
 * - Path traversal prevention
 * - URL encoding bypass prevention
 * - Query parameter validation
 * - Audit logging of blocked attempts
 */

import { supabase } from './supabase';

// APPROVED REDIRECT DESTINATION - DO NOT MODIFY
const APPROVED_REDIRECT_URL = 'https://3rd-party-coatings-i-udgh.bolt.host/';

// Parsed components for validation
const APPROVED_URL_OBJ = new URL(APPROVED_REDIRECT_URL);
const APPROVED_PROTOCOL = APPROVED_URL_OBJ.protocol; // https:
const APPROVED_HOSTNAME = APPROVED_URL_OBJ.hostname; // 3rd-party-coatings-i-udgh.bolt.host
const APPROVED_PATHNAME = APPROVED_URL_OBJ.pathname; // /

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

/**
 * Blocked redirect attempt log entry
 */
export interface BlockedRedirectLog {
  attemptedUrl: string;
  reason: string;
  timestamp: string;
  userId?: string;
  userAgent?: string;
}

/**
 * Validates a URL for redirection
 *
 * @param url - The URL to validate
 * @returns ValidationResult indicating if redirect is allowed
 */
export function validateRedirectUrl(url: string): ValidationResult {
  // Empty or null check
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      reason: 'URL is required and must be a string',
    };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Check for exact match first (most common case)
  if (trimmedUrl === APPROVED_REDIRECT_URL) {
    return {
      isValid: true,
      sanitizedUrl: APPROVED_REDIRECT_URL,
    };
  }

  // Try to parse as URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (error) {
    return {
      isValid: false,
      reason: 'Invalid URL format',
    };
  }

  // Protocol validation - MUST be HTTPS
  if (parsedUrl.protocol !== APPROVED_PROTOCOL) {
    return {
      isValid: false,
      reason: `Invalid protocol. Only ${APPROVED_PROTOCOL} is allowed`,
    };
  }

  // Hostname validation - exact match required
  if (parsedUrl.hostname !== APPROVED_HOSTNAME) {
    return {
      isValid: false,
      reason: `Invalid hostname. Only ${APPROVED_HOSTNAME} is allowed`,
    };
  }

  // Pathname validation - must be root path only
  if (parsedUrl.pathname !== APPROVED_PATHNAME) {
    return {
      isValid: false,
      reason: `Invalid path. Only ${APPROVED_PATHNAME} is allowed`,
    };
  }

  // Query parameters validation - should not have any
  if (parsedUrl.search && parsedUrl.search !== '') {
    return {
      isValid: false,
      reason: 'Query parameters are not allowed',
    };
  }

  // Hash/fragment validation - should not have any
  if (parsedUrl.hash && parsedUrl.hash !== '') {
    return {
      isValid: false,
      reason: 'URL fragments/hashes are not allowed',
    };
  }

  // Port validation - should use default HTTPS port (443)
  if (parsedUrl.port && parsedUrl.port !== '' && parsedUrl.port !== '443') {
    return {
      isValid: false,
      reason: 'Custom ports are not allowed',
    };
  }

  // Username/password validation - should not have credentials in URL
  if (parsedUrl.username || parsedUrl.password) {
    return {
      isValid: false,
      reason: 'Credentials in URL are not allowed',
    };
  }

  // All checks passed
  return {
    isValid: true,
    sanitizedUrl: APPROVED_REDIRECT_URL,
  };
}

/**
 * Performs a safe redirect to the approved URL only
 *
 * @param requestedUrl - The URL that was requested for redirect
 * @param options - Redirect options
 * @returns Promise that resolves when redirect is complete or rejects if blocked
 */
export async function safeRedirect(
  requestedUrl: string,
  options: {
    newWindow?: boolean;
    logBlocked?: boolean;
  } = {}
): Promise<void> {
  const { newWindow = false, logBlocked = true } = options;

  // Validate the URL
  const validation = validateRedirectUrl(requestedUrl);

  if (!validation.isValid) {
    // Log the blocked attempt
    if (logBlocked) {
      await logBlockedRedirect(requestedUrl, validation.reason || 'Unknown reason');
    }

    // Throw error to notify caller
    throw new Error(
      `Redirect blocked: ${validation.reason}\n\n` +
      `Only redirects to ${APPROVED_REDIRECT_URL} are allowed.`
    );
  }

  // Perform the redirect to the approved URL
  if (newWindow) {
    // Open in new window/tab
    const newWin = window.open(validation.sanitizedUrl, '_blank', 'noopener,noreferrer');
    if (!newWin) {
      throw new Error('Popup blocked by browser. Please allow popups for this site.');
    }
  } else {
    // Navigate in current window
    window.location.href = validation.sanitizedUrl!;
  }
}

/**
 * Creates a safe external link element with validation
 *
 * @param url - The URL to link to
 * @returns Validated URL for href attribute or null if invalid
 */
export function getSafeExternalLinkHref(url: string): string | null {
  const validation = validateRedirectUrl(url);

  if (!validation.isValid) {
    console.warn(`Blocked unsafe link: ${url} - ${validation.reason}`);
    return null;
  }

  return validation.sanitizedUrl || null;
}

/**
 * Logs a blocked redirect attempt to the database
 *
 * @param attemptedUrl - The URL that was attempted
 * @param reason - Why it was blocked
 */
async function logBlockedRedirect(attemptedUrl: string, reason: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const logEntry: BlockedRedirectLog = {
      attemptedUrl,
      reason,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      userAgent: navigator.userAgent,
    };

    // Log to console for immediate visibility
    console.warn('[SECURITY] Blocked redirect attempt:', logEntry);

    // Store in database for audit trail
    const { error } = await supabase
      .from('security_logs')
      .insert({
        event_type: 'blocked_redirect',
        user_id: user?.id || null,
        details: logEntry,
        severity: 'warning',
        created_at: new Date().toISOString(),
      });

    if (error) {
      // If we can't log to database, at least log to console
      console.error('Failed to log blocked redirect to database:', error);
    }
  } catch (error) {
    // Don't let logging errors break the security check
    console.error('Error logging blocked redirect:', error);
  }
}

/**
 * React hook for safe external links
 *
 * @param url - The URL to validate
 * @returns Object with validated href and click handler
 */
export function useSafeExternalLink(url: string) {
  const validation = validateRedirectUrl(url);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!validation.isValid) {
      alert(
        `This link is not allowed.\n\n` +
        `Reason: ${validation.reason}\n\n` +
        `Only links to ${APPROVED_REDIRECT_URL} are permitted.`
      );
      await logBlockedRedirect(url, validation.reason || 'Unknown reason');
      return;
    }

    try {
      await safeRedirect(url, { newWindow: true });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Redirect failed');
    }
  };

  return {
    href: validation.isValid ? validation.sanitizedUrl : '#',
    onClick: handleClick,
    isValid: validation.isValid,
    reason: validation.reason,
  };
}

/**
 * Gets the approved redirect URL (read-only)
 */
export function getApprovedRedirectUrl(): string {
  return APPROVED_REDIRECT_URL;
}

/**
 * Checks if a given URL is the approved redirect URL
 */
export function isApprovedUrl(url: string): boolean {
  const validation = validateRedirectUrl(url);
  return validation.isValid;
}

// Export constants for reference (read-only)
export const SECURITY_CONFIG = {
  APPROVED_URL: APPROVED_REDIRECT_URL,
  APPROVED_PROTOCOL,
  APPROVED_HOSTNAME,
  APPROVED_PATHNAME,
} as const;
