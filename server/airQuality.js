// airQuality.js
const axios = require('axios');

/**
 * Fetch AQI data from AirNow API
 * @param {number} lat - Latitude of the location
 * @param {number} lon - Longitude of the location
 * @param {string} apiKey - AirNow API key
 * @returns {Promise<Object>} - AQI data with aqi value and airQuality description
 */
const fetchAQI = async (lat, lon, apiKey) => {
    try {
        console.log('Fetching AQI data...');
        
        // Check if API key is provided
        if (!apiKey) {
            console.warn('No AirNow API key provided. Skipping AQI fetch.');
            return { aqi: -1, airQuality: 'Unavailable (No API key)' };
        }
        
        const response = await axios.get('https://www.airnowapi.org/aq/observation/latLong/current', {
            params: {
                format: 'application/json',
                latitude: lat,
                longitude: lon,
                distance: 25, // Increased search radius to find more results
                API_KEY: apiKey,
            },
            timeout: 8000 // 8 second timeout
        });

        if (response.data && response.data.length > 0) {
            // Sort data to get the most recent observation
            const sortedData = response.data.sort((a, b) => new Date(b.DateObserved) - new Date(a.DateObserved));

            // Attempt to find PM2.5 (preferred) or fallback to the first available entry
            const aqiData = sortedData.find(item => item.ParameterName === 'PM2.5') || sortedData[0];

            console.log('AQI data fetched successfully:', aqiData);

            return {
                aqi: aqiData.AQI,
                airQuality: aqiData.Category.Name,
            };
        } else {
            console.warn('No AQI data available for the specified location.');
            return { aqi: -1, airQuality: 'No Data Available' };
        }
    } catch (error) {
        console.error('Error fetching AQI data:', error.message);
        
        // Handle different types of errors
        if (error.response && error.response.status === 429) {
            return { aqi: -1, airQuality: 'Rate limit exceeded' };
        } else if (error.code === 'ECONNABORTED') {
            return { aqi: -1, airQuality: 'Connection timeout' };
        } else if (!error.response) {
            return { aqi: -1, airQuality: 'Network error' };
        }
        
        return { aqi: -1, airQuality: 'Unavailable' };
    }
};

module.exports = { fetchAQI };