require('dotenv').config({path: '.env.local'});
const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");

async function main() {
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    // Print a sanitized version of the URL (hide password)
    const urlObj = new URL(process.env.DATABASE_URL);
    urlObj.password = '****';
    console.log('DATABASE_URL pattern:', urlObj.toString());
  }
  
  try {
    console.log('Creating Neon client...');
    const client = neon(process.env.DATABASE_URL);
    console.log('Creating Drizzle instance...');
    const db = drizzle(client);
    
    console.log('Executing query...');
    const result = await db.execute('SELECT 1 as test');
    console.log('Query result:', result);
    console.log('Connection successful!');
  } catch (error) {
    console.error('Connection error type:', error.constructor.name);
    console.error('Connection error message:', error.message);
    console.error('Connection error stack:', error.stack);
  }
}

main().catch(err => {
  console.error('Unhandled error in main:', err);
});
