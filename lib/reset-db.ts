import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { sql } from "drizzle-orm"

/**
 * This script drops all tables in the database and recreates the schema using Drizzle's push.
 * Use with caution as it will delete all data!
 */
export async function resetDatabase() {
  console.log("🚨 WARNING: This will delete all data in your database! 🚨")
  console.log("Starting database reset process...")

  // Create a Neon client
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set")
    throw new Error("DATABASE_URL environment variable is not set")
  }

  console.log("Connecting to database...")

  try {
    // Configure Neon client with a longer timeout (5 minutes)
    const client = neon(connectionString, {
      connectionTimeoutMillis: 300000, // 5 minutes
      queryTimeoutMillis: 300000, // 5 minutes
    })

    const db = drizzle(client)

    // Test connection
    console.log("Testing database connection...")
    const testResult = await db.execute(sql`SELECT 1 as test`)
    console.log("Connection test result:", testResult)

    console.log("1. Dropping all tables...")

    try {
      // First, drop all foreign key constraints to avoid dependency issues
      console.log("Dropping foreign key constraints...")
      await db
        .execute(sql`
       DO $$ 
       DECLARE
         r RECORD;
       BEGIN
         FOR r IN (SELECT conname, conrelid::regclass AS table_name FROM pg_constraint WHERE contype = 'f') 
         LOOP
           EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.conname || ' CASCADE';
         END LOOP;
       END $$;
     `)
        .catch((err) => {
          console.log("Warning: Error dropping foreign key constraints (continuing anyway):", err.message)
        })

      // Get all tables in the public schema
      const tablesResult = await db.execute(sql`
       SELECT tablename 
       FROM pg_tables 
       WHERE schemaname = 'public'
     `)

      const tables = tablesResult.rows.map((row) => row.tablename)
      console.log(`Found ${tables.length} tables to drop: ${tables.join(", ")}`)

      // Drop each table individually with CASCADE to handle dependencies
      for (const table of tables) {
        console.log(`Dropping table: ${table}`)
        try {
          // Set a timeout for each table drop operation
          await Promise.race([
            db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`)),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout dropping table ${table}`)), 60000)),
          ])
          console.log(`Successfully dropped table: ${table}`)
        } catch (tableError) {
          console.error(`Error dropping table ${table}:`, tableError.message)
          // Continue with other tables even if one fails
        }
      }

      // Get all enum types
      const enumsResult = await db.execute(sql`
       SELECT t.typname
       FROM pg_type t
       JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
       WHERE t.typtype = 'e' AND n.nspname = 'public'
     `)

      const enums = enumsResult.rows.map((row) => row.typname)
      console.log(`Found ${enums.length} enum types to drop: ${enums.join(", ")}`)

      // Drop each enum type
      for (const enumType of enums) {
        console.log(`Dropping enum type: ${enumType}`)
        try {
          await db.execute(sql.raw(`DROP TYPE IF EXISTS "${enumType}" CASCADE`))
          console.log(`Successfully dropped enum type: ${enumType}`)
        } catch (enumError) {
          console.error(`Error dropping enum type ${enumType}:`, enumError.message)
          // Continue with other enums even if one fails
        }
      }

      console.log("All tables and types dropped successfully.")
    } catch (dropError) {
      console.error("Error dropping tables and types:", dropError)
      throw new Error(
        `Failed to drop tables and types: ${dropError instanceof Error ? dropError.message : String(dropError)}`,
      )
    }

    console.log("2. Creating schema directly from schema definitions...")
    try {
      // Import the schema and create tables directly
      console.log("Creating enum types...")

      // Create enum types (removed post_status enum)
      await db.execute(sql`CREATE TYPE theme_status AS ENUM ('pending', 'selected', 'discarded')`)
      console.log("Created theme_status enum type")

      await db.execute(sql`CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'archived')`)
      console.log("Created campaign_status enum type")

      // Create campaigns table
      await db.execute(sql`
       CREATE TABLE campaigns (
         id SERIAL PRIMARY KEY,
         title TEXT NOT NULL,
         repeat_every_days INTEGER NOT NULL,
         target_customer TEXT,
         insight TEXT,
         description TEXT,
         status campaign_status NOT NULL DEFAULT 'draft',
         current_step INTEGER NOT NULL DEFAULT 0,
         start_date DATE,
         last_run_date DATE,
         next_run_date DATE,
         is_active BOOLEAN NOT NULL DEFAULT TRUE
       )
     `)
      console.log("Created campaigns table")

      // Create themes table with post_status column
      await db.execute(sql`
       CREATE TABLE themes (
         id SERIAL PRIMARY KEY,
         campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
         title TEXT NOT NULL,
         story TEXT,
         is_selected BOOLEAN NOT NULL DEFAULT FALSE,
         status theme_status NOT NULL DEFAULT 'pending',
         post_status TEXT,
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )
     `)
      console.log("Created themes table")

      // Create content_posts table with TEXT status instead of enum
      // Added images, selected_images, and default_image_index columns
      await db.execute(sql`
       CREATE TABLE content_posts (
         id SERIAL PRIMARY KEY,
         campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
         theme_id INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
         title TEXT,
         content TEXT,
         status TEXT DEFAULT 'approved',
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         scheduled_date DATE,
         posted_at TIMESTAMP,
         feedback TEXT,
         image_url TEXT,
         video_url TEXT,
         images TEXT,
         selected_images TEXT,
         default_image_index INTEGER DEFAULT 0
       )
     `)
      console.log("Created content_posts table")

      console.log("Schema created successfully.")
    } catch (schemaError) {
      console.error("Error creating schema:", schemaError)
      throw new Error(
        `Failed to create schema: ${schemaError instanceof Error ? schemaError.message : String(schemaError)}`,
      )
    }

    console.log("✅ Database reset successfully!")
    return { success: true }
  } catch (error) {
    console.error("❌ Error resetting database:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined,
    }
  }
}
