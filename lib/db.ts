import { neon, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { sql } from "drizzle-orm"
import * as schema from "./schema"

// Configure neon with improved options
neonConfig.fetchOptions = {
  cache: "no-store", // Disable caching
  keepalive: true, // Keep connection alive
}

neonConfig.connectionTimeoutMillis = 10000 // 10 seconds
neonConfig.queryTimeoutMillis = 30000 // 30 seconds

// Create a singleton SQL client to prevent connection issues
let sqlClient: ReturnType<typeof neon> | null = null

// Get or create the SQL client
function getSqlClient() {
  if (!sqlClient) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    try {
      sqlClient = neon(connectionString)
      console.log("Neon SQL client initialized successfully")
    } catch (error) {
      console.error("Failed to create Neon client:", error)
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return sqlClient
}

// Create a Drizzle ORM instance with lazy initialization
export const db = drizzle(getSqlClient(), { schema })

// Test the database connection
export async function testDatabaseConnection() {
  try {
    const result = await db.execute(sql`SELECT 1 as test`)
    return { success: true, result }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

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

// Helper function to safely execute database queries with proper error handling
export async function safeQuery<T>(queryFn: () => Promise<T>): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await executeWithRetry(queryFn)
    return { data: result, error: null }
  } catch (error) {
    console.error("Database query failed:", error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}
