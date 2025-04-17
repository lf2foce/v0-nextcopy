import { resetDatabase } from "./reset-db"

async function main() {
  console.log("Starting database reset...")

  try {
    const result = await resetDatabase()

    if (result.success) {
      console.log("Database reset completed successfully!")
      process.exit(0)
    } else {
      console.error("Database reset failed:", result.error)
      if (result.details) {
        console.error("Error details:", result.details)
      }
      process.exit(1)
    }
  } catch (error) {
    console.error("Unexpected error during database reset:", error)
    process.exit(1)
  }
}

// Add a timeout for the entire process
const timeout = setTimeout(
  () => {
    console.error("Database reset timed out after 10 minutes")
    process.exit(1)
  },
  10 * 60 * 1000,
) // 10 minutes

// Clear the timeout if the process completes
main().finally(() => clearTimeout(timeout))
