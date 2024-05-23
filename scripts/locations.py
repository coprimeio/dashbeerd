import os
import requests
import psycopg2
from dotenv import load_dotenv
from base64 import b64encode
import logging

# Set up logging
logging.basicConfig(filename='locations.log', level=logging.INFO)

# Load environment variables from .env file
load_dotenv()

# Access environment variables
connection_uri = os.getenv('DASHBEERD_NEON_DB_URI_STAGING')
api_key = os.getenv('CATALOG_BEER_API_KEY')

# Function to fetch a list of location IDs
def fetch_location_ids(count=7000):
    base_url = f'https://api.catalog.beer/location?count={count}'
    credentials = b64encode(f'{api_key}:'.encode()).decode()
    headers = {
        'Authorization': f'Basic {credentials}',
        'Accept': 'application/json'
    }

    try:
        response = requests.get(base_url, headers=headers, timeout=10000)
        if response.ok:
            data = response.json()
            location_ids = [location['id'] for location in data['data']]
            return location_ids
        else:
            print(f'Failed to retrieve location IDs: {response.status_code}')
            return []
    except Exception as error:
        print(f'An error occurred: {error}')
        return []

# Function to fetch detailed information for a location by ID and insert into the database
def fetch_and_insert_location_details(location_id, cursor):
    base_url = f'https://api.catalog.beer/location/{location_id}'
    credentials = b64encode(f'{api_key}:'.encode()).decode()
    headers = {
        'Authorization': f'Basic {credentials}',
        'Accept': 'application/json'
    }

    try:
        response = requests.get(base_url, headers=headers, timeout=10000)
        if response.ok:
            location = response.json()

            # Flatten the address object
            address = location.pop('address', {})
            for key, value in address.items():
                location[f'{key}'] = value

            location_data = (
                location.get('id'),
                location.get('object'),
                location.get('name'),
                location.get('brewer_id'),
                location.get('url', ''),
                location.get('country_code'),
                location.get('country_short_name'),
                location.get('latitude'),
                location.get('longitude'),
                location.get('telephone'),
                location.get('address1', ''),
                location.get('address2', ''),
                location.get('city'),
                location.get('sub_code', ''),
                location.get('state_short'),
                location.get('state_long'),
                location.get('zip5'),
                location.get('zip4', None)  # Assuming zip4 is optional
            )
            cursor.execute(
                """
                INSERT INTO catalog_beer.location (
                    id, object, name, brewer_id, url, country_code, country_short_name, 
                    latitude, longitude, telephone, address1, address2, city, sub_code, 
                    state_short, state_long, zip5, zip4
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                location_data
            )
            logging.info(f'Location data for ID {location_id} inserted or updated successfully.')
        else:
            print(f'Failed to retrieve details for location ID {location_id}: {response.status_code}')
    except Exception as error:
        print(f'An error occurred for location ID {location_id}: {error}')

# Main execution flow
def main():
    location_ids = fetch_location_ids(7000)
    logging.info(f'Location IDs: {location_ids}')

    # Connect to the database
    conn = psycopg2.connect(connection_uri)
    cursor = conn.cursor()

    for location_id in location_ids:
        fetch_and_insert_location_details(location_id, cursor)

    # Commit the transaction and close the connection
    conn.commit()
    cursor.close()
    conn.close()
    print("All location data inserted or updated successfully.")

if __name__ == '__main__':
    main()
