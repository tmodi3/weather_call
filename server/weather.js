// weather.js
const axios = require('axios');

/**
 * Fetch weather data from the NWS API with hourly granularity
 * @param {number} lat - Latitude of the location
 * @param {number} lon - Longitude of the location
 * @param {string} userAgent - User-Agent string for the API requests
 * @param {Date} eventStartTime - Event start time
 * @returns {Promise<Object>} - Weather forecast and alerts data
 */
const fetchWeatherData = async (lat, lon, userAgent, eventStartTime) => {
    try {
        console.log('Fetching location metadata from NWS API...');
        console.log(`Event start time: ${eventStartTime.toLocaleString()}`);

        // Fetch the point data to get forecast URLs
        const pointsResponse = await axios.get(`https://api.weather.gov/points/${lat},${lon}`, {
            headers: { 'User-Agent': userAgent },
            timeout: 10000 // 10 second timeout
        });

        // Get both standard forecast and hourly forecast URLs
        const forecastUrl = pointsResponse.data.properties.forecast;
        const hourlyForecastUrl = pointsResponse.data.properties.forecastHourly;
        const forecastZone = pointsResponse.data.properties.forecastZone;

        if (!forecastUrl || !hourlyForecastUrl || !forecastZone) {
            throw new Error('Required forecast URLs are undefined.');
        }

        // Try to get hourly forecast first (more precise)
        console.log('Fetching hourly forecast data...');
        let hourlyForecast = null;
        try {
            const hourlyResponse = await axios.get(hourlyForecastUrl, {
                headers: { 'User-Agent': userAgent },
                timeout: 10000
            });
            
            if (hourlyResponse.data && hourlyResponse.data.properties && 
                hourlyResponse.data.properties.periods && 
                hourlyResponse.data.properties.periods.length > 0) {
                hourlyForecast = hourlyResponse.data.properties.periods;
            }
        } catch (hourlyError) {
            console.warn('Error fetching hourly forecast, will fall back to standard forecast:', hourlyError.message);
        }

        // Find the relevant forecast period using hourly data if available
        let relevantForecast = null;
        if (hourlyForecast) {
            // With hourly data, find the exact hour
            relevantForecast = hourlyForecast.find(period => {
                const periodStart = new Date(period.startTime);
                const periodEnd = new Date(period.endTime);
                return eventStartTime >= periodStart && eventStartTime < periodEnd;
            });
            
            if (relevantForecast) {
                console.log('Found matching hourly forecast for the event time');
            }
        }

        // If no hourly forecast match, fall back to standard forecast
        if (!relevantForecast) {
            console.log('No hourly forecast found, fetching standard forecast...');
            const forecastResponse = await axios.get(forecastUrl, {
                headers: { 'User-Agent': userAgent },
                timeout: 10000
            });

            const forecastPeriods = forecastResponse.data.properties.periods;

            // Find the relevant forecast period
            relevantForecast = forecastPeriods.find(period => {
                const periodStart = new Date(period.startTime);
                const periodEnd = new Date(period.endTime);
                return eventStartTime >= periodStart && eventStartTime < periodEnd;
            });

            if (!relevantForecast) {
                // No exact match, find the nearest future forecast period
                console.warn('No exact forecast match for event time, using nearest future period.');
                
                // Convert the forecast periods to timestamps and find the closest one
                const now = new Date();
                const futurePeriods = forecastPeriods.filter(period => 
                    new Date(period.endTime) > now
                );
                
                if (futurePeriods.length > 0) {
                    // Sort periods by start time (ascending)
                    futurePeriods.sort((a, b) => 
                        new Date(a.startTime) - new Date(b.startTime)
                    );
                    
                    // Find the closest period to the event time
                    const eventTime = eventStartTime.getTime();
                    relevantForecast = futurePeriods.reduce((closest, current) => {
                        const currentStart = new Date(current.startTime).getTime();
                        const closestStart = closest ? new Date(closest.startTime).getTime() : Infinity;
                        
                        const currentDiff = Math.abs(currentStart - eventTime);
                        const closestDiff = Math.abs(closestStart - eventTime);
                        
                        return currentDiff < closestDiff ? current : closest;
                    }, null);
                    
                    console.log(`Selected nearest forecast period: ${relevantForecast.name}`);
                } else {
                    // No future periods available, use the first period
                    relevantForecast = forecastPeriods[0];
                    console.log('No future periods available, using first available period');
                }
            }
        }

        if (!relevantForecast) {
            throw new Error('No forecast data available for the given time.');
        }

        console.log(`Selected forecast period: ${relevantForecast.name}`);
        console.log(`Period time: ${new Date(relevantForecast.startTime).toLocaleString()} to ${new Date(relevantForecast.endTime).toLocaleString()}`);

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