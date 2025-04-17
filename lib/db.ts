import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

// Create a Neon SQL client with better error handling
const getNeonClient = () => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  try {
    return neon(connectionString)
  } catch (error) {
    console.error("Failed to create Neon client:", error)
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Create a Drizzle ORM instance
export const db = drizzle(getNeonClient())
