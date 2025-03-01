// weather.js
const axios = require('axios');

/**
 * Fetch weather data from the NWS API
 * @param {number} lat - Latitude of the location
 * @param {number} lon - Longitude of the location
 * @param {string} userAgent - User-Agent string for the API requests
 * @param {Date} eventStartTime - Event start time
 * @returns {Promise<Object>} - Weather forecast and alerts data
 */
const fetchWeatherData = async (lat, lon, userAgent, eventStartTime) => {
    try {
        console.log('Fetching location metadata from NWS API...');

        // Fetch the point data to get forecast URL
        const pointsResponse = await axios.get(`https://api.weather.gov/points/${lat},${lon}`, {
            headers: { 'User-Agent': userAgent },
            timeout: 10000 // 10 second timeout
        });

        const forecastUrl = pointsResponse.data.properties.forecast;
        const forecastZone = pointsResponse.data.properties.forecastZone;

        if (!forecastUrl || !forecastZone) {
            throw new Error('forecastUrl or forecastZone is undefined.');
        }

        console.log('Fetching forecast data...');
        const forecastResponse = await axios.get(forecastUrl, {
            headers: { 'User-Agent': userAgent },
            timeout: 10000 // 10 second timeout
        });

        const forecastPeriods = forecastResponse.data.properties.periods;

        // Find the relevant forecast period
        const relevantForecast = forecastPeriods.find(period => {
            const periodStart = new Date(period.startTime);
            const periodEnd = new Date(period.endTime);
            return eventStartTime >= periodStart && eventStartTime < periodEnd;
        });

        if (!relevantForecast) {
            // If no exact match, use the current period or first available
            console.warn('No exact forecast match for event time, using current period.');
            const currentTime = new Date();
            const currentPeriod = forecastPeriods.find(period => {
                const periodStart = new Date(period.startTime);
                const periodEnd = new Date(period.endTime);
                return currentTime >= periodStart && currentTime < periodEnd;
            }) || forecastPeriods[0];
            
            if (!currentPeriod) {
                throw new Error('No forecast data available.');
            }
            
            console.log('Using fallback forecast data:', currentPeriod.name);
            
            return {
                forecast: currentPeriod,
                alerts: { features: [] } // Empty alerts if no relevant forecast
            };
        }

        console.log('Relevant forecast data:', relevantForecast);

        // Fetch weather alerts with error handling
        console.log('Fetching weather alerts...');
        let alertsResponse;
        try {
            alertsResponse = await axios.get(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {
                headers: { 'User-Agent': userAgent },
                timeout: 8000 // 8 second timeout for alerts
            });
        } catch (alertError) {
            console.error('Error fetching alerts (continuing anyway):', alertError.message);
            alertsResponse = { data: { features: [] } }; // Empty alerts object
        }

        return {
            forecast: relevantForecast,
            alerts: alertsResponse.data,
        };
    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        // Check for network issues and provide a clearer error message
        if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.message.includes('timeout')) {
            throw new Error('Network timeout while connecting to weather service. Please try again later.');
        }
        throw error;
    }
};

module.exports = { fetchWeatherData };