// geolocation.js
const axios = require('axios');

/**
 * Get geolocation data from IP address
 * Uses a free IP geolocation API
 * @returns {Promise<Object>} - Geolocation data including lat/long
 */
const getGeolocationFromIP = async () => {
    try {
        console.log('Fetching geolocation from IP address...');
        
        // Use a free IP geolocation service (ipapi.co)
        const response = await axios.get('https://ipapi.co/json/', {
            timeout: 5000
        });
        
        const data = response.data;
        
        if (!data.latitude || !data.longitude) {
            console.warn('Could not determine geolocation from IP');
            return {
                success: false,
                lat: null,
                lon: null,
                city: null,
                country: null,
                error: 'Could not determine location'
            };
        }
        
        console.log(`Geolocation found: ${data.city}, ${data.country_name} (${data.latitude}, ${data.longitude})`);
        
        return {
            success: true,
            lat: data.latitude,
            lon: data.longitude,
            city: data.city,
            region: data.region,
            country: data.country_name,
            countryCode: data.country_code
        };
    } catch (error) {
        console.error('Error fetching geolocation:', error.message);
        
        // Fallback to Madison, WI coordinates if geolocation fails
        return {
            success: false,
            lat: 43.07625, // Default to Madison, WI
            lon: -89.40006,
            city: 'Madison',
            region: 'Wisconsin',
            country: 'United States',
            countryCode: 'US',
            error: error.message
        };
    }
};

/**
 * Get geolocation from coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} - Location information
 */
const getLocationFromCoordinates = async (lat, lon) => {
    try {
        console.log(`Fetching location info for coordinates: ${lat}, ${lon}`);
        
        // Use OpenStreetMap Nominatim API (free reverse geocoding)
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
                lat: lat,
                lon: lon,
                format: 'json',
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'Weather Decision App'
            },
            timeout: 5000
        });
        
        const data = response.data;
        
        if (!data.address) {
            console.warn('Could not determine location from coordinates');
            return {
                success: false,
                city: 'Unknown Location',
                error: 'Could not determine location'
            };
        }
        
        const locationInfo = {
            success: true,
            city: data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown',
            region: data.address.state || '',
            country: data.address.country || '',
            countryCode: data.address.country_code?.toUpperCase() || '',
            raw: data
        };
        
        console.log(`Location found: ${locationInfo.city}, ${locationInfo.region}, ${locationInfo.country}`);
        
        return locationInfo;
    } catch (error) {
        console.error('Error fetching location info:', error.message);
        return {
            success: false,
            city: 'Unknown Location',
            error: error.message
        };
    }
};

module.exports = { getGeolocationFromIP, getLocationFromCoordinates };