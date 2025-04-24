import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Create a connection pool to the database with improved options
const sql = neon(process.env.DATABASE_URL!, {
  connectionTimeoutMillis: 10000, // 10 seconds
  queryTimeoutMillis: 30000, // 30 seconds
  fetchOptions: {
    cache: "no-store", // Disable caching
    keepalive: true, // Keep connection alive
  },
})

export const db = drizzle(sql)

// Utility function to execute a function with retry logic and exponential backoff
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500,
  maxDelay = 5000,
): Promise<T> {
  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add some jitter to prevent all retries happening at the same time
      const jitter = Math.random() * 200 - 100 // ±100ms jitter

      if (attempt > 0) {
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay...`)
        await new Promise((resolve) => setTimeout(resolve, delay + jitter))
      }

      return await fn()
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error)
      lastError = error

      // Exponential backoff with max delay cap
      delay = Math.min(delay * 2, maxDelay)
    }
  }

  throw lastError
}
