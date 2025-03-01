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
        console.log(`Location: ${lat}, ${lon}`);
        
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
                distance: 50, // Increased search radius to find more results
                API_KEY: apiKey,
            },
            timeout: 10000 // 10 second timeout
        });

        if (response.data && response.data.length > 0) {
            // Sort data to get the most recent observation
            const sortedData = response.data.sort((a, b) => {
                const dateA = new Date(`${a.DateObserved} ${a.HourObserved}:00`);
                const dateB = new Date(`${b.DateObserved} ${b.HourObserved}:00`);
                return dateB - dateA;
            });

            console.log(`Found ${response.data.length} AQI observations`);
            
            // Log all available observations for debugging
            sortedData.forEach((obs, index) => {
                console.log(`Observation ${index + 1}:`, {
                    parameter: obs.ParameterName,
                    date: obs.DateObserved,
                    hour: obs.HourObserved,
                    aqi: obs.AQI,
                    category: obs.Category.Name,
                    location: `${obs.ReportingArea}, ${obs.StateCode}`
                });
            });

            // Attempt to find PM2.5 (preferred) or fallback to the first available entry
            const pm25Data = sortedData.find(item => item.ParameterName === 'PM2.5');
            const ozoneData = sortedData.find(item => item.ParameterName === 'O3');
            
            // Use PM2.5 data if available, otherwise use Ozone, otherwise use first observation
            const aqiData = pm25Data || ozoneData || sortedData[0];

            console.log('Using AQI data:', {
                parameter: aqiData.ParameterName,
                date: aqiData.DateObserved,
                hour: aqiData.HourObserved,
                aqi: aqiData.AQI,
                category: aqiData.Category.Name
            });

            return {
                aqi: aqiData.AQI,
                airQuality: `${aqiData.Category.Name} (${aqiData.ParameterName})`,
                parameter: aqiData.ParameterName
            };
        } else {
            console.warn('No AQI data available for the specified location.');
            return { aqi: -1, airQuality: 'No Data Available' };
        }
    } catch (error) {
        console.error('Error fetching AQI data:', error.message);
        
        // Handle different types of errors
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
            
            if (error.response.status === 429) {
                return { aqi: -1, airQuality: 'Rate limit exceeded' };
            } else if (error.response.status === 403) {
                return { aqi: -1, airQuality: 'Invalid API key' };
            }
        } else if (error.code === 'ECONNABORTED') {
            return { aqi: -1, airQuality: 'Connection timeout' };
        } else if (!error.response) {
            return { aqi: -1, airQuality: 'Network error' };
        }
        
        return { aqi: -1, airQuality: 'Unavailable' };
    }
};

module.exports = { fetchAQI };