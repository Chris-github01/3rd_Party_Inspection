import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useSafeExternalLink } from '../lib/urlValidation';

interface SafeExternalLinkProps {
  url: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  showWarning?: boolean;
}

/**
 * SafeExternalLink Component
 *
 * A secure link component that only allows redirects to the approved URL.
 * Automatically validates and blocks unauthorized redirect attempts.
 *
 * Usage:
 * <SafeExternalLink url="https://3rd-party-coatings-i-udgh.bolt.host/">
 *   Visit Coatings Database
 * </SafeExternalLink>
 */
export function SafeExternalLink({
  url,
  children,
  className = '',
  showIcon = true,
  showWarning = false,
}: SafeExternalLinkProps) {
  const { href, onClick, isValid, reason } = useSafeExternalLink(url);

  const baseClasses = isValid
    ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
    : 'text-red-600 cursor-not-allowed opacity-60';

  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={href}
        onClick={onClick}
        className={`${baseClasses} ${className}`}
        target={isValid ? '_blank' : undefined}
        rel={isValid ? 'noopener noreferrer' : undefined}
        title={!isValid ? `Blocked: ${reason}` : 'Open in new window'}
      >
        {children}
        {showIcon && isValid && <ExternalLink className="w-4 h-4 inline ml-1" />}
        {showWarning && !isValid && <AlertTriangle className="w-4 h-4 inline ml-1" />}
      </a>
      {!isValid && showWarning && (
        <span className="text-xs text-red-500 ml-2">
          (Link blocked: {reason})
        </span>
      )}
    </span>
  );
}

/**
 * SafeExternalButton Component
 *
 * A button that performs safe redirects to approved URLs only
 */
interface SafeExternalButtonProps {
  url: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function SafeExternalButton({
  url,
  children,
  className = '',
  variant = 'primary',
  disabled = false,
}: SafeExternalButtonProps) {
  const { onClick, isValid, reason } = useSafeExternalLink(url);

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-600 hover:bg-slate-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const buttonClass = isValid
    ? `${variantClasses[variant]} ${className}`
    : `bg-slate-400 cursor-not-allowed ${className}`;

  return (
    <button
      onClick={onClick}
      disabled={disabled || !isValid}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonClass}`}
      title={!isValid ? `Blocked: ${reason}` : undefined}
    >
      {children}
      {!isValid && <AlertTriangle className="w-4 h-4 inline ml-2" />}
    </button>
  );
}
