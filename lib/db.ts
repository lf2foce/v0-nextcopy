import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

// Create a Neon SQL client with better error handling
const getNeonClient = () => {
  // Log all available environment variables (omitting values for security)
  console.log("Available env vars:", Object.keys(process.env).join(", "))
  
  const connectionString = process.env.DATABASE_URL
  
  // Use hardcoded connection string if environment variable is not set
  if (!connectionString) {
    console.warn("DATABASE_URL not found in environment variables, using fallback connection")
    // Hardcoded connection string as fallback (same as in .env.local)
    return neon("postgresql://nextcopy-test_owner:npg_APBy0zjmHsq5@ep-fancy-dream-a1r128wz-pooler.ap-southeast-1.aws.neon.tech/nextcopy-test?sslmode=require")
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
