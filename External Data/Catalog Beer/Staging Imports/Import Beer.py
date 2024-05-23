import requests
import base64
import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Access environment variables
connection_uri = os.getenv('DASHBEERD_NEON_DB_URI_STAGING')
api_key = os.getenv('CATALOG_BEER_API_KEY')

# Connect to Neon DB
conn = psycopg2.connect(connection_uri)
cur = conn.cursor()

# Encode your API Key for Basic Auth
credentials = base64.b64encode(f'{api_key}:'.encode('utf-8')).decode('utf-8')
headers = {
    'Authorization': f'Basic {credentials}',
    'Accept': 'application/json'
}

# Function to fetch a list of beer IDs
def fetch_beer_ids(count=100):
    base_url = f'https://api.catalog.beer/beer?count={count}'
    try:
        response = requests.get(base_url, headers=headers, timeout=10)  # Set timeout to 10 seconds
        if response.status_code == 200:
            beers = response.json().get('data', [])
            beer_ids = [beer['id'] for beer in beers]
            return beer_ids
        else:
            print('Failed to retrieve beer IDs:', response.status_code)
            return []
    except requests.exceptions.Timeout:
        print('Request timed out. Please try again later.')
        return []
    except requests.exceptions.RequestException as e:
        print(f'An error occurred: {e}')
        return []

# Function to fetch detailed information for a beer by ID and insert into the database
def fetch_and_insert_beer_details(beer_id, cursor):
    base_url = f'https://api.catalog.beer/beer/{beer_id}'
    try:
        response = requests.get(base_url, headers=headers, timeout=10)  # Set timeout to 10 seconds
        if response.status_code == 200:
            beer = response.json()
            beer_data = (
                beer.get('id'),
                beer.get('object'),
                beer.get('name'),
                beer.get('style'),
                beer.get('description'),
                beer.get('abv'),
                beer.get('ibu'),
                beer.get('cb_verified'),
                beer.get('brewer_verified'),
                beer.get('brewer').get('id') if beer.get('brewer') else None
            )
            cursor.execute(
                """
                INSERT INTO catalog_beer.beer (id, object, name, style, description, abv, ibu, cb_verified, brewer_verified, brewer_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                """,
                beer_data
            )
            print(f'Beer data for ID {beer_id} inserted or updated successfully.')
        else:
            print(f'Failed to retrieve details for beer ID {beer_id}:', response.status_code)
    except requests.exceptions.Timeout:
        print(f'Request timed out for beer ID {beer_id}. Please try again later.')
    except requests.exceptions.RequestException as e:
        print(f'An error occurred for beer ID {beer_id}: {e}')
    except Exception as db_error:
        print(f'Database error for beer ID {beer_id}: {db_error}')

# Main execution flow
def main():
    beer_ids = fetch_beer_ids(count=100)
    for beer_id in beer_ids:
        fetch_and_insert_beer_details(beer_id, cur)
    conn.commit()
    print("All beer data inserted or updated successfully.")

# Run the main function
if __name__ == '__main__':
    main()

# Close the connection
cur.close()
conn.close()
