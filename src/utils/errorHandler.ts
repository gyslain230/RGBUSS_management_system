/**
 * Centralized error handling utilities
 */

import { sanitizeErrorMessage, logSecurityEvent } from './security';
import toast from 'react-hot-toast';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: any;
}

// Security: Centralized error handler
export const handleError = (error: any, context: ErrorContext = {}) => {
  const sanitizedMessage = sanitizeErrorMessage(error);
  
  // Log security event
  logSecurityEvent('application_error', {
    component: context.component,
    action: context.action,
    error: error?.message?.substring(0, 50),
    user_id: context.userId
  });
  
  // Show user-friendly message
  toast.error(sanitizedMessage);
  
  // In production, send to monitoring service
  if (import.meta.env.PROD) {
    // This would integrate with services like Sentry, LogRocket, etc.
    // sendToMonitoringService(error, context);
  }
};

// Security: Database operation error handler
export const handleDatabaseError = (error: any, operation: string) => {
  const context: ErrorContext = {
    component: 'database',
    action: operation
  };
  
  // Map common database errors to user-friendly messages
  if (error?.code === '23505') {
    toast.error('This record already exists');
    return;
  }
  
  if (error?.code === '23503') {
    toast.error('Cannot complete operation due to related data');
    return;
  }
  
  if (error?.code === '42501') {
    toast.error('Permission denied');
    return;
  }
  
  handleError(error, context);
};

// Security: Authentication error handler
export const handleAuthError = (error: any, action: string) => {
  const context: ErrorContext = {
    component: 'authentication',
    action
  };
  
  // Handle specific auth errors
  if (error?.message?.includes('Invalid login credentials')) {
    toast.error('Invalid email or password');
    return;
  }
  
  if (error?.message?.includes('User already registered')) {
    toast.error('An account with this email already exists');
    return;
  }
  
  if (error?.message?.includes('Email not confirmed')) {
    toast.error('Please verify your email address');
    return;
  }
  
  handleError(error, context);
};

// Security: Network error handler
export const handleNetworkError = (error: any) => {
  if (error?.message?.includes('Failed to fetch') || 
      error?.message?.includes('Network Error') ||
      error?.message?.includes('timeout')) {
    toast.error('Connection error. Please check your internet connection.');
    return;
  }
  
  handleError(error, { component: 'network' });
};