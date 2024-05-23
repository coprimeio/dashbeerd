import os
import requests
import psycopg2
from dotenv import load_dotenv
from base64 import b64encode
import logging

# Set up logging
logging.basicConfig(filename='brewers.log', level=logging.INFO)

# Load environment variables from .env file
load_dotenv()

# Access environment variables
connection_uri = os.getenv('DASHBEERD_NEON_DB_URI_STAGING')
api_key = os.getenv('CATALOG_BEER_API_KEY')

# Function to fetch a list of brewer IDs
def fetch_brewer_ids(count=7000):
    base_url = f'https://api.catalog.beer/brewer?count={count}'
    credentials = b64encode(f'{api_key}:'.encode()).decode()
    headers = {
        'Authorization': f'Basic {credentials}',
        'Accept': 'application/json'
    }

    try:
        response = requests.get(base_url, headers=headers, timeout=10000)
        if response.ok:
            data = response.json()
            brewer_ids = [brewer['id'] for brewer in data['data']]
            return brewer_ids
        else:
            print(f'Failed to retrieve brewer IDs: {response.status_code}')
            return []
    except Exception as error:
        print(f'An error occurred: {error}')
        return []

# Function to fetch detailed information for a brewer by ID and insert into the database
def fetch_and_insert_brewer_details(brewer_id, cursor):
    base_url = f'https://api.catalog.beer/brewer/{brewer_id}'
    credentials = b64encode(f'{api_key}:'.encode()).decode()
    headers = {
        'Authorization': f'Basic {credentials}',
        'Accept': 'application/json'
    }

    try:
        response = requests.get(base_url, headers=headers, timeout=10000)
        if response.ok:
            brewer = response.json()
            brewer_data = (
                brewer['id'],
                brewer['object'],
                brewer['name'],
                brewer['description'],
                brewer['short_description'],
                brewer['url'],
                brewer['cb_verified'],
                brewer['brewer_verified'],
                brewer['facebook_url'],
                brewer['twitter_url'],
                brewer['instagram_url']
            )
            cursor.execute(
                """
                INSERT INTO catalog_beer.brewer (id, object, name, description, short_description, url, cb_verified, brewer_verified, facebook_url, twitter_url, instagram_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                brewer_data
            )
            logging.info(f'Brewer data for ID {brewer_id} inserted or updated successfully.')
        else:
            print(f'Failed to retrieve details for brewer ID {brewer_id}: {response.status_code}')
    except Exception as error:
        print(f'An error occurred for brewer ID {brewer_id}: {error}')

# Main execution flow
def main():
    brewer_ids = fetch_brewer_ids(7000)
    logging.info('Brewer ids', brewer_ids)

    # Connect to the database
    conn = psycopg2.connect(connection_uri)
    cursor = conn.cursor()

    for brewer_id in brewer_ids:
        fetch_and_insert_brewer_details(brewer_id, cursor)

    # Commit the transaction and close the connection
    conn.commit()
    cursor.close()
    conn.close()
    print("All brewer data inserted or updated successfully.")

if __name__ == '__main__':
    main()
