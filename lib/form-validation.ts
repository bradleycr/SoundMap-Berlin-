import { AppError, ErrorType, ErrorSeverity } from "./error-handler"

/**
 * Form validation utilities with comprehensive error handling
 */

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  field?: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  firstError?: string
}

/**
 * Validate a single field
 */
export function validateField(
  value: any,
  rules: ValidationRule,
  fieldName: string = 'field'
): ValidationResult {
  const errors: string[] = []
  const stringValue = String(value || '').trim()

  // Required validation
  if (rules.required && !stringValue) {
    errors.push(`${fieldName} is required`)
  }

  // Skip other validations if field is empty and not required
  if (!stringValue && !rules.required) {
    return { isValid: true, errors: [], field: fieldName }
  }

  // Min length validation
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`)
  }

  // Max length validation
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(`${fieldName} must be no more than ${rules.maxLength} characters`)
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push(`${fieldName} format is invalid`)
  }

  // Custom validation
  if (rules.custom) {
    const customResult = rules.custom(value)
    if (customResult !== true) {
      errors.push(typeof customResult === 'string' ? customResult : `${fieldName} is invalid`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    field: fieldName
  }
}

/**
 * Validate multiple form fields
 */
export function validateForm(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): FormValidationResult {
  const errors: Record<string, string[]> = {}
  let firstError: string | undefined

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const result = validateField(data[fieldName], fieldRules, fieldName)
    
    if (!result.isValid) {
      errors[fieldName] = result.errors
      if (!firstError) {
        firstError = result.errors[0]
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstError
  }
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  return validateField(email, {
    required: true,
    pattern: emailPattern
  }, 'Email')
}

/**
 * Username validation
 */
export function validateUsername(username: string): ValidationResult {
  const usernamePattern = /^[a-zA-Z0-9_-]+$/
  
  return validateField(username, {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: usernamePattern,
    custom: (value) => {
      const username = String(value).toLowerCase()
      
      // Reserved usernames
      const reserved = ['admin', 'root', 'user', 'anonymous', 'guest', 'test']
      if (reserved.includes(username)) {
        return 'This username is reserved. Please choose another.'
      }
      
      return true
    }
  }, 'Username')
}

/**
 * Audio clip title validation
 */
export function validateClipTitle(title: string): ValidationResult {
  return validateField(title, {
    required: true,
    minLength: 1,
    maxLength: 100,
    custom: (value) => {
      const title = String(value).trim()
      
      // Check for inappropriate content (basic filter)
      const inappropriateWords = ['spam', 'test123', 'asdf']
      if (inappropriateWords.some(word => title.toLowerCase().includes(word))) {
        return 'Please use a more descriptive title.'
      }
      
      return true
    }
  }, 'Title')
}

/**
 * Simple form validation state management
 * Note: For React hook version, import useState from 'react' in your component
 */
export function createFormValidator<T extends Record<string, any>>(
  initialData: T,
  rules: Record<keyof T, ValidationRule>
) {
  return {
    validate: (data: T) => validateForm(data, rules),
    validateField: (fieldName: keyof T, value: any) => 
      validateField(value, rules[fieldName], String(fieldName)),
    initialData,
    rules
  }
}

/**
 * Throw validation error for form submissions
 */
export function throwValidationError(
  result: FormValidationResult,
  formName: string = 'form'
): never {
  throw new AppError(
    `${formName} validation failed`,
    ErrorType.VALIDATION,
    ErrorSeverity.LOW,
    {
      context: { validationErrors: result.errors },
      userMessage: result.firstError || 'Please check your input and try again.',
      retryable: false
    }
  )
} 