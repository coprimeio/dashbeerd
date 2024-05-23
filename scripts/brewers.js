import { Buffer } from 'buffer';
import { Client } from 'pg';

// Access environment variables
const connectionUri = process.env.DASHBEERD_NEON_DB_URI_STAGING;
const apiKey = process.env.CATALOG_BEER_API_KEY;

// Connect to Neon DB
const client = new Client({ connectionString: connectionUri });
await client.connect();

const credentials = Buffer.from(`${apiKey}:`).toString('base64');
const headers = {
    'Authorization': `Basic ${credentials}`,
    'Accept': 'application/json'
};

// Function to fetch a list of beer IDs
async function fetchBrewerIds(count = 100) {
    const baseUrl = `https://api.catalog.beer/brewer?count=${count}`;
    try {
        const response = await fetch(baseUrl, { headers, timeout: 10000 });
        if (response.ok) {
            const data = await response.json();
            const brewerIds = data.data.map(brewer => brewer.id);
            return brewerIds;
        } else {
            console.log('Failed to retrieve brewer IDs:', response.status);
            return [];
        }
    } catch (error) {
        console.log('An error occurred:', error);
        return [];
    }
}

// Function to fetch detailed information for a beer by ID and insert into the database
async function fetchAndInsertbrewerDetails(brewerId) {
    const baseUrl = `https://api.catalog.beer/brewer/${brewerId}`;
    try {
        const response = await fetch(baseUrl, { headers, timeout: 10000 });  // Set timeout to 10 seconds
        if (response.ok) {
            const brewer = await response.json();
            const brewerData = [

                brewer.id,
                brewer.object,
                brewer.name,
                brewer.description,
                brewer.short_description,
                brewer.url,
                brewer.cb_verified,
                brewer.brewer_verified,
                brewer.facebook_url,
                brewer.twitter_url,
                brewer.instagram_url
            ];
            await client.query(
                `
                INSERT INTO catalog_beer.brewer (id, object, name, description, short_description, url, cb_verified, brewer_verified, facebook_url, twitter_url, instagram_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
                `,
                beerData
            );
            console.log(`Brewer data for ID ${brewerId} inserted or updated successfully.`);
        } else {
            console.log(`Failed to retrieve details for brewer ID ${brewerId}:`, response.status);
        }
    } catch (error) {
        console.log(`An error occurred for brewer ID ${brewerId}:`, error);
    }
}

// Main execution flow
async function main() {
    const beerIds = await fetchBrewerIds(100);
    console.log('brewer ids', brewerIds)
    // for (const brewerId of brewerIds) {
    //     await fetchAndInsertBrewerDetails(brewerId);
    // }
    await client.end();
    console.log("All brewer data inserted or updated successfully.");
}

// Run the main function
await main();
