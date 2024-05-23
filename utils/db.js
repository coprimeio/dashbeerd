import { Client } from 'pg';

// Access environment variables
const connectionUri = process.env.DASHBEERD_NEON_DB_URI_STAGING;
const apiKey = process.env.CATALOG_BEER_API_KEY;

// Connect to Neon DB
export const db = new Client({ connectionString: connectionUri });
await db.connect();