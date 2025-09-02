/**
 * Comprehensive validation utilities
 */

import { sanitizeInput, validateInput } from './security';

// Security: Form validation schemas
export const validationSchemas = {
  user: {
    email: (email: string) => {
      if (!email || typeof email !== 'string') {
        return { isValid: false, error: 'Email is required' };
      }
      
      const sanitized = sanitizeInput(email.trim().toLowerCase(), 254);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(sanitized)) {
        return { isValid: false, error: 'Please enter a valid email address' };
      }
      
      if (sanitized.length < 5 || sanitized.length > 254) {
        return { isValid: false, error: 'Email length is invalid' };
      }
      
      return { isValid: true, value: sanitized };
    },
    
    fullName: (name: string) => {
      if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Full name is required' };
      }
      
      const sanitized = sanitizeInput(name.trim(), 100);
      
      if (sanitized.length < 2) {
        return { isValid: false, error: 'Full name must be at least 2 characters' };
      }
      
      if (sanitized.length > 100) {
        return { isValid: false, error: 'Full name is too long' };
      }
      
      // Check for suspicious patterns
      if (/<script|javascript:|data:/i.test(sanitized)) {
        return { isValid: false, error: 'Invalid characters in name' };
      }
      
      return { isValid: true, value: sanitized };
    },
    
    role: (role: string) => {
      const validRoles = ['admin', 'manager', 'worker'];
      
      if (!role || typeof role !== 'string') {
        return { isValid: false, error: 'Role is required' };
      }
      
      if (!validRoles.includes(role)) {
        return { isValid: false, error: 'Invalid role specified' };
      }
      
      return { isValid: true, value: role };
    }
  },
  
  product: {
    name: (name: string) => {
      if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Product name is required' };
      }
      
      const sanitized = sanitizeInput(name.trim(), 100);
      
      if (sanitized.length < 1) {
        return { isValid: false, error: 'Product name is required' };
      }
      
      if (sanitized.length > 100) {
        return { isValid: false, error: 'Product name is too long' };
      }
      
      return { isValid: true, value: sanitized };
    },
    
    price: (price: any) => {
      const numPrice = Number(price);
      
      if (isNaN(numPrice)) {
        return { isValid: false, error: 'Price must be a valid number' };
      }
      
      if (numPrice <= 0) {
        return { isValid: false, error: 'Price must be greater than 0' };
      }
      
      if (numPrice > 999999.99) {
        return { isValid: false, error: 'Price is too large' };
      }
      
      // Round to 2 decimal places
      const roundedPrice = Math.round(numPrice * 100) / 100;
      
      return { isValid: true, value: roundedPrice };
    },
    
    quantity: (quantity: any) => {
      const numQuantity = Number(quantity);
      
      if (isNaN(numQuantity)) {
        return { isValid: false, error: 'Quantity must be a valid number' };
      }
      
      if (numQuantity < 0) {
        return { isValid: false, error: 'Quantity cannot be negative' };
      }
      
      if (!Number.isInteger(numQuantity)) {
        return { isValid: false, error: 'Quantity must be a whole number' };
      }
      
      if (numQuantity > 999999) {
        return { isValid: false, error: 'Quantity is too large' };
      }
      
      return { isValid: true, value: numQuantity };
    },
    
    category: (category: string) => {
      if (!category || typeof category !== 'string') {
        return { isValid: false, error: 'Category is required' };
      }
      
      const sanitized = sanitizeInput(category.trim(), 50);
      
      if (sanitized.length < 1) {
        return { isValid: false, error: 'Category is required' };
      }
      
      return { isValid: true, value: sanitized };
    },
    
    description: (description?: string) => {
      if (!description) {
        return { isValid: true, value: null };
      }
      
      if (typeof description !== 'string') {
        return { isValid: false, error: 'Description must be text' };
      }
      
      const sanitized = sanitizeInput(description.trim(), 500);
      
      if (sanitized.length > 500) {
        return { isValid: false, error: 'Description is too long' };
      }
      
      return { isValid: true, value: sanitized };
    }
  },
  
  credit: {
    customerName: (name: string) => {
      if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Customer name is required' };
      }
      
      const sanitized = sanitizeInput(name.trim(), 100);
      
      if (sanitized.length < 2) {
        return { isValid: false, error: 'Customer name must be at least 2 characters' };
      }
      
      return { isValid: true, value: sanitized };
    },
    
    amount: (amount: any) => {
      const numAmount = Number(amount);
      
      if (isNaN(numAmount)) {
        return { isValid: false, error: 'Amount must be a valid number' };
      }
      
      if (numAmount <= 0) {
        return { isValid: false, error: 'Amount must be greater than 0' };
      }
      
      if (numAmount > 999999.99) {
        return { isValid: false, error: 'Amount is too large' };
      }
      
      // Round to 2 decimal places
      const roundedAmount = Math.round(numAmount * 100) / 100;
      
      return { isValid: true, value: roundedAmount };
    },
    
    dueDate: (date: string) => {
      if (!date || typeof date !== 'string') {
        return { isValid: false, error: 'Due date is required' };
      }
      
      const dueDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(dueDate.getTime())) {
        return { isValid: false, error: 'Invalid due date' };
      }
      
      if (dueDate < today) {
        return { isValid: false, error: 'Due date cannot be in the past' };
      }
      
      return { isValid: true, value: date };
    }
  }
};

// Security: Batch validation helper
export const validateFormData = (data: any, schema: any): { isValid: boolean; errors: string[]; sanitizedData: any } => {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  for (const [field, validator] of Object.entries(schema)) {
    if (typeof validator === 'function') {
      const result = (validator as Function)(data[field]);
      
      if (!result.isValid) {
        errors.push(result.error);
      } else {
        sanitizedData[field] = result.value;
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
};