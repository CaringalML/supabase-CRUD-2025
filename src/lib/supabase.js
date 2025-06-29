import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create client with additional security options
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Don't persist sessions since we're not using auth
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'food-inventory-app', // Add client identification
    },
  },
})

// Add input validation helper functions
export const validateFoodData = (data) => {
  const errors = []
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required')
  }
  
  if (data.name && data.name.length > 255) {
    errors.push('Name must be less than 255 characters')
  }
  
  if (data.quantity && data.quantity < 0) {
    errors.push('Quantity cannot be negative')
  }
  
  if (data.category && data.category.length > 100) {
    errors.push('Category must be less than 100 characters')
  }
  
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes must be less than 1000 characters')
  }
  
  return errors
}

// Rate limiting helper (simple client-side)
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) { // 10 requests per minute
    this.requests = []
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }
  
  isAllowed() {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      return false
    }
    
    this.requests.push(now)
    return true
  }
}

export const rateLimiter = new RateLimiter()