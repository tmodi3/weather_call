// weather.js
const axios = require('axios');

/**
 * Fetch weather data from the OpenWeather API
 * @param {number} lat - Latitude of the location
 * @param {number} lon - Longitude of the location
 * @param {string} apiKey - OpenWeather API key
 * @returns {Promise<Object>} - Weather forecast and alerts data
 */
const fetchWeatherData = async (lat, lon, apiKey) => {
    try {
        console.log('Fetching weather data from OpenWeather API...');
        console.log(`Location: ${lat}, ${lon}`);

        // Make API call to OpenWeather
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
            params: {
                lat: lat,
                lon: lon,
                appid: apiKey,
                units: 'imperial', // Use imperial units for temperature in Fahrenheit
                lang: 'en'        // Response in English
            },
            timeout: 10000 // 10 second timeout
        });

        console.log('Weather data received from OpenWeather API');
        
        // Transform OpenWeather API response into our app's format
        const weatherData = response.data;
        
        // Extract weather condition from the first weather item (if available)
        const weatherCondition = weatherData.weather && weatherData.weather.length > 0 
            ? weatherData.weather[0] 
            : { main: 'Unknown', description: 'Unknown weather condition' };
        
        // Check for thunderstorm conditions
        const isThunderstorm = weatherCondition.main === 'Thunderstorm';
        
        // Extract rain data (if available)
        const rainAmount = weatherData.rain && weatherData.rain['1h'] 
            ? weatherData.rain['1h'] 
            : 0;
            
        // Calculate chance of rain (estimated based on clouds and humidity)
        const rainChance = calculateRainChance(weatherData.clouds?.all, weatherData.main?.humidity, weatherCondition.main);
        
        // Format the data to match our application's expected structure
        const formattedData = {
            forecast: {
                name: getCurrentTimeOfDay(),
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                temperature: weatherData.main?.temp,
                temperatureUnit: 'F',
                windSpeed: `${weatherData.wind?.speed || 0} mph`,
                windDirection: getWindDirection(weatherData.wind?.deg),
                windGust: `${weatherData.wind?.gust || 0} mph`,
                shortForecast: weatherCondition.main,
                detailedForecast: `${weatherCondition.description}. Temperature: ${weatherData.main?.temp}°F. ${rainChance}% chance of precipitation.`,
                icon: weatherData.weather && weatherData.weather.length > 0 ? weatherData.weather[0].icon : '',
                city: weatherData.name || 'Unknown Location',
                country: weatherData.sys?.country || ''
            },
            alerts: {
                features: [] // Default empty alerts
            }
        };
        
        console.log('Formatted forecast data:', formattedData.forecast);
        
        return formattedData;
    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        if (error.response) {
            console.error('API response error:', error.response.status, error.response.data);
        }
        
        // Check for network issues and provide a clearer error message
        if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.message.includes('timeout')) {
            throw new Error('Network timeout while connecting to weather service. Please try again later.');
        }
        throw error;
    }
};

/**
 * Get the current time of day description
 * @returns {string} - Description of the current time of day
 */
function getCurrentTimeOfDay() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
}

/**
 * Convert wind degrees to cardinal direction
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} - Cardinal direction
 */
function getWindDirection(degrees) {
    if (degrees === undefined) return 'Unknown';
    
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((degrees %= 360) < 0 ? degrees + 360 : degrees) / 45) % 8;
    return directions[index];
}

/**
 * Calculate chance of rain based on clouds and humidity
 * @param {number} cloudiness - Cloud percentage
 * @param {number} humidity - Humidity percentage
 * @param {string} weatherMain - Main weather condition
 * @returns {number} - Estimated chance of rain (0-100)
 */
function calculateRainChance(cloudiness = 0, humidity = 0, weatherMain = '') {
    // Base chance on cloudiness and humidity
    let chance = 0;
    
    // If it's already raining or drizzling, high chance
    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
        chance = 90;
    } 
    // If it's thunderstorm, very high chance
    else if (weatherMain === 'Thunderstorm') {
        chance = 95;
    }
    // Otherwise estimate based on cloud cover and humidity
    else {
        // Cloudiness contributes 60% to the rain chance
        // Humidity contributes 40% to the rain chance
        chance = (cloudiness * 0.6) + (humidity * 0.4);
        
        // Cap at 95%
        chance = Math.min(chance, 95);
    }
    
    return Math.round(chance);
}

module.exports = { fetchWeatherData };