// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { fetchAQI } = require('./server/airQuality');
const { fetchWeatherData } = require('./server/weather');
const { getGeolocationFromIP, getLocationFromCoordinates } = require('./server/geolocation');

const app = express();
const port = process.env.PORT || 3000;

// Configurations
const openWeatherApiKey = process.env.OPENWEATHER_API_KEY || 'ed366a8a6b65f29654c39ef7bc4e7a86';
const airNowApiKey = process.env.AIRNOW_API_KEY;

// Default coordinates (Madison, WI)
const defaultLat = 43.07625;
const defaultLon = -89.40006;

// Initialize Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [new winston.transports.Console()],
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    logger.info('Serving index.html to the user.');
    res.sendFile(__dirname + '/public/index.html');
});

// Route to get user's geolocation
app.get('/getLocation', async (req, res) => {
    try {
        const geoData = await getGeolocationFromIP();
        
        if (geoData.success) {
            logger.info(`Location detected: ${geoData.city}, ${geoData.country} (${geoData.lat}, ${geoData.lon})`);
            res.json(geoData);
        } else {
            logger.warn(`Could not detect location, using default: ${defaultLat}, ${defaultLon}`);
            res.json({
                lat: defaultLat,
                lon: defaultLon,
                city: 'Madison',
                region: 'Wisconsin',
                country: 'United States',
                countryCode: 'US',
                usingDefault: true
            });
        }
    } catch (error) {
        logger.error(`Error getting location: ${error.message}`);
        res.status(500).json({ 
            error: 'Could not determine location',
            lat: defaultLat,
            lon: defaultLon
        });
    }
});

app.post('/getWeather', async (req, res) => {
    const { eventTime, lat, lon } = req.body;

    try {
        logger.info(`Received payload: ${JSON.stringify(req.body)}`);

        // Validate eventTime
        if (!eventTime || !/^\d{2}:\d{2}$/.test(eventTime)) {
            logger.error(`Invalid or missing eventTime: ${eventTime}`);
            throw new Error('Invalid or missing eventTime. Must be in HH:mm format.');
        }

        // Parse event time
        const [eventHour, eventMinute] = eventTime.split(':').map(Number);
        const eventStartTime = new Date();
        eventStartTime.setHours(eventHour, eventMinute, 0, 0);
        logger.info(`Parsed event start time: ${eventStartTime}`);

        // Use provided coordinates or default to Madison, WI
        const latitude = lat || defaultLat;
        const longitude = lon || defaultLon;
        
        // Get location name if coordinates are provided but no location info
        let locationInfo = null;
        if (lat && lon && (!req.body.city || !req.body.country)) {
            try {
                locationInfo = await getLocationFromCoordinates(latitude, longitude);
            } catch (locError) {
                logger.warn(`Could not get location info from coordinates: ${locError.message}`);
            }
        }

        // Fetch weather data from OpenWeather API
        logger.info(`Fetching weather data for: ${latitude}, ${longitude}`);
        const { forecast, alerts } = await fetchWeatherData(latitude, longitude, openWeatherApiKey);
        logger.info('Weather data fetched successfully.');

        // Select the relevant forecast period
        const period = forecast;
        logger.info(`Selected forecast period: ${period.name}`);

        // Parse forecast data
        const temp = period.temperature;
        const windSpeed = parseWindValue(period.windSpeed);
        const windGust = parseWindValue(period.windGust || '0 mph');
        const rainChance = extractRainChance(period.detailedForecast);
        const thunderstorm = period.shortForecast === 'Thunderstorm';

        logger.info(`Parsed forecast data for event: ${JSON.stringify({
            temp,
            windSpeed,
            windGust,
            rainChance,
            thunderstorm,
        })}`);

        // Check for tornado warnings (not available in basic OpenWeather API)
        const tornadoAlert = false;

        logger.info(`Tornado alert: ${tornadoAlert}`);

        // Fetch AQI data
        logger.info('Fetching AQI data...');
        const { aqi, airQuality } = await fetchAQI(latitude, longitude, airNowApiKey);
        logger.info(`AQI data fetched successfully: { aqi: ${aqi}, airQuality: ${airQuality} }`);

        // Calculate recommendations
        const recommendation = calculateRecommendation(temp, windSpeed, rainChance, thunderstorm, aqi);
        logger.info(`Recommendation calculated: ${JSON.stringify(recommendation)}`);

        // Format time range for display
        const periodStart = new Date(period.startTime);
        const periodEnd = new Date(period.endTime);
        const periodTimeRange = `${periodStart.toLocaleString()} to ${periodEnd.toLocaleString()}`;

        // Get location name to display
        const locationName = locationInfo?.city || period.city || req.body.city || 'Unknown Location';
        const country = locationInfo?.country || period.country || req.body.country || '';
        const locationDisplay = country ? `${locationName}, ${country}` : locationName;

        // Respond with all collected data
        const response = {
            thunderstormAlert: thunderstorm ? 'Yes' : 'No',
            tornadoAlert: tornadoAlert ? 'Yes' : 'No',
            temperature: temp,
            windSpeed: windSpeed,
            windGust: windGust,
            rainChance: rainChance,
            airQuality: airQuality || 'Unavailable',
            recommendation: recommendation.text,
            finalDecision: recommendation.finalDecision,
            forecastPeriod: period.name,
            forecastTime: periodTimeRange,
            shortForecast: period.shortForecast,
            location: locationDisplay,
            score: recommendation.score,
            scoreDetails: recommendation.scoreDetails,
            weatherIcon: period.icon
        };

        logger.info(`Final response sent to frontend: ${JSON.stringify(response)}`);
        res.json(response);
    } catch (error) {
        logger.error(`Error during weather or AQI processing: ${error.message || error}`);
        res.status(500).send({ error: error.message || 'Error fetching weather or AQI data.' });
    }
});

function parseWindValue(windStr) {
    const numbers = windStr.match(/\d+(\.\d+)?/g);
    if (!numbers) return 0;
    return Math.max(...numbers.map(Number));
}

function extractRainChance(forecastStr) {
    let rainChance = 0;
    const rainMatch = forecastStr.match(/(\d+)% chance of precipitation/i);
    if (rainMatch) {
        rainChance = parseInt(rainMatch[1], 10);
    }
    return rainChance;
}

function calculateRecommendation(temp, windSpeed, rainChance, thunderstorm, aqi) {
    let score = 0;
    const scoreDetails = [];

    // Temperature scoring
    if (temp <= 58) {
        score -= 2;
        scoreDetails.push('Temperature below 58°F: -2');
    } else if (temp <= 65) {
        score -= 1;
        scoreDetails.push('Temperature below 65°F: -1');
    }

    // Wind speed scoring
    if (windSpeed >= 44.7) {
        score -= 2;
        scoreDetails.push('Wind speed above 44.7 mph: -2');
    } else if (windSpeed >= 33.5) {
        score -= 1;
        scoreDetails.push('Wind speed above 33.5 mph: -1');
    }

    // Rain chance scoring
    if (rainChance >= 95) {
        score -= 2;
        scoreDetails.push('Rain chance above 95%: -2');
    } else if (rainChance >= 80) {
        score -= 1;
        scoreDetails.push('Rain chance above 80%: -1');
    }

    // Thunderstorm and AQI scoring
    if (thunderstorm) {
        score -= 2;
        scoreDetails.push('Thunderstorm detected: -2');
    }
    
    if (aqi >= 151) {
        score -= 2;
        scoreDetails.push('AQI above 151: -2');
    } else if (aqi >= 101) {
        score -= 1;
        scoreDetails.push('AQI above 101: -1');
    }

    // Determine recommendation based on score
    let text = 'Great';
    if (score <= -5) text = 'Bad';
    else if (score <= -2) text = 'Marginal';

    const finalDecision = text === 'Bad' ? 'Inside' : text === 'Great' ? 'Outside' : 'Depends';
    
    logger.info(`Score: ${score}, Details: ${scoreDetails.join(', ')}`);

    return { 
        text, 
        finalDecision, 
        score,
        scoreDetails 
    };
}

app.post('/submitVotes', (req, res) => {
    const { diningVote, programVote, facilitiesVote } = req.body;

    try {
        logger.info(`Received votes: ${JSON.stringify({ diningVote, programVote, facilitiesVote })}`);

        // Validate votes
        const validVotes = ['Outside', 'Inside', 'Abstain'];
        if (
            !validVotes.includes(diningVote) ||
            !validVotes.includes(programVote) ||
            !validVotes.includes(facilitiesVote)
        ) {
            logger.error(`Invalid votes detected: ${JSON.stringify({ diningVote, programVote, facilitiesVote })}`);
            return res.status(400).json({ error: 'Invalid vote options.' });
        }

        const finalDecision = calculateFinalDecision(diningVote, programVote, facilitiesVote);
        logger.info(`Final decision calculated: ${finalDecision}`);

        res.json({ diningVote, programVote, facilitiesVote, finalDecision });
    } catch (error) {
        logger.error(`Error processing votes: ${error.message || error}`);
        res.status(500).send({ error: error.message || 'Error processing votes.' });
    }
});

function calculateFinalDecision(diningVote, programVote, facilitiesVote) {
    logger.info(`Calculating final decision with votes: ${JSON.stringify({ diningVote, programVote, facilitiesVote })}`);

    const votes = [diningVote, programVote, facilitiesVote];
    const outsideVotes = votes.filter(v => v === 'Outside').length;
    const insideVotes = votes.filter(v => v === 'Inside').length;

    if (outsideVotes >= 2) return 'Outside';
    if (insideVotes >= 2) return 'Inside';
    return 'Depends';
}

app.listen(port, () => {
    logger.info(`Weather Decision App running on port ${port}`);
});