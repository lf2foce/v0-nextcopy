import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { migrate } from "drizzle-orm/neon-http/migrator"

// This script can be run with `node --require dotenv/config lib/migrate.js`
async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle({ client: sql })

  console.log("Running migrations...")

  await migrate(db, { migrationsFolder: "drizzle" })

  console.log("Migrations completed!")

  process.exit(0)
}

main().catch((err) => {
  console.error("Migration failed!")
  console.error(err)
  process.exit(1)
})
