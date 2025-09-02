/**
 * Security utilities for authentication and data protection
 */

// Security: Input sanitization
export const sanitizeInput = (input: string, maxLength: number = 100): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS protection
    .substring(0, maxLength);
};

// Security: Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Security: Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Security: Clear all browser storage
export const clearAllStorage = (): void => {
  try {
    // Clear localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Clear any IndexedDB data (if used)
    if ('indexedDB' in window) {
      indexedDB.databases?.().then(databases => {
        databases.forEach(db => {
          if (db.name?.includes('supabase') || db.name?.includes('auth')) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }).catch(() => {
        // Ignore errors in clearing IndexedDB
      });
    }
  } catch (error) {
  }
};

// Security: Session validation
export const isSessionValid = (session: any): boolean => {
  if (!session) return false;
  
  // Check if session has required properties
  if (!session.access_token || !session.user) return false;
  
  // Check if session is expired
  if (session.expires_at && session.expires_at * 1000 < Date.now()) {
    return false;
  }
  
  return true;
};

// Security: Rate limiting for login attempts
class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if under limit
    if (record.count < this.maxAttempts) {
      record.count++;
      record.lastAttempt = now;
      return true;
    }
    
    return false;
  }
  
  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    
    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }
}

export const loginRateLimiter = new RateLimiter();

// Security: Generate secure random string
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Security: Detect if running in secure context
export const isSecureContext = (): boolean => {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
};

// Security: Content Security Policy helper
export const enforceCSP = (): void => {
  // Add CSP meta tag if not present
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;";
    document.head.appendChild(meta);
  }
};

// Security: Initialize security measures
export const initializeSecurity = (): void => {
  // Enforce CSP
  enforceCSP();
  
  // Disable right-click context menu in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  // Disable F12 and other dev tools shortcuts in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'C') ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
      }
    });
  }
};