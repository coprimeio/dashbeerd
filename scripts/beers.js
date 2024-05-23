import { Buffer } from 'buffer';
import { customAlphabet } from 'nanoid';
import { Client } from 'pg';
import allBeerIds from '../allBeerIds.json';
import { write } from '../fs-utils.js';

export const AZ09 = 'abcdefghijklmnopqrstuvwxyz0123456789'
export const nanoid = customAlphabet(AZ09, 12)

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
async function fetchBeerIds(count = 100) {
    const baseUrl = `https://api.catalog.beer/beer?count=${count}`;
    try {
        const response = await fetch(baseUrl, { headers, timeout: 10000 });
        if (response.ok) {
            const data = await response.json();
            const beerIds = data.data.map(beer => beer.id);
            return beerIds;
        } else {
            console.log('Failed to retrieve beer IDs:', response.status);
            return [];
        }
    } catch (error) {
        console.log('An error occurred:', error);
        return [];
    }
}

// Function to fetch detailed information for a beer by ID and insert into the database
async function fetchAndInsertBeerDetails(beerId) {
    const baseUrl = `https://api.catalog.beer/beer/${beerId}`;
    try {
        const response = await fetch(baseUrl, { headers, timeout: 10000 });  // Set timeout to 10 seconds
        if (response.ok) {
            const beer = await response.json();
            const id = nanoid()
            const beerData = [
                // id,
                beer.id,
                beer.object,
                beer.name,
                beer.style,
                beer.description,
                beer.abv,
                beer.ibu,
                beer.cb_verified,
                beer.brewer_verified,
                beer.brewer ? beer.brewer.id : null
            ];
            await client.query(
                `
                INSERT INTO catalog_beer.beer (id, object, name, style, description, abv, ibu, cb_verified, brewer_verified, brewer_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO UPDATE SET
                    object = EXCLUDED.object,
                    name = EXCLUDED.name,
                    style = EXCLUDED.style,
                    description = EXCLUDED.description,
                    abv = EXCLUDED.abv,
                    ibu = EXCLUDED.ibu,
                    cb_verified = EXCLUDED.cb_verified,
                    brewer_verified = EXCLUDED.brewer_verified,
                    brewer_id = EXCLUDED.brewer_id;
                `,
                beerData
            );
            console.log(`Beer data for ID ${beerId} inserted or updated successfully.`);
        } else {
            console.log(`Failed to retrieve details for beer ID ${beerId}:`, response.status);
        }
    } catch (error) {
        console.log(`An error occurred for beer ID ${beerId}:`, error);
    }
}

async function main() {
    // const beerIds = await fetchBeerIds(100000);

    const res = await client.query(`SELECT id FROM catalog_beer.beer `)
    const finishedIds = res.rows.map(row => row.id)

    const allBeers = JSON.parse(allBeerIds)
    console.log('all beer ids', allBeers)
    // allBeers.forEach(async (beerId) => {
    //   if (!finishedIds.includes(beerId)) {
    //     console.log('fetching', beerId)
    //     await fetchAndInsertBeerDetails(beerId);
    //   }
    // });
    await Promise.all(allBeers.map(async (beerId) => {
      if (!finishedIds.includes(beerId)) {
          console.log('fetching', beerId)
          await fetchAndInsertBeerDetails(beerId)
      }
  }))
    // await write('beerIds.json', JSON.stringify(beerIds, null, 2))


    // console.log('beer ids', allBeerIds)
    // for (let i = 0; i < 100; i++) {
      // console.log('beer ids', beerIds)
    // for (const beerId of beerIds) {
    //     await fetchAndInsertBeerDetails(beerId);
    // }
    // }
    await client.end();
    console.log("All beer data inserted or updated successfully.");
}

// Run the main function
await main();
