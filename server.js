// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const winston = require('winston');
const { fetchAQI } = require('./server/airQuality');
const { fetchWeatherData } = require('./server/weather');

const app = express();
const port = process.env.PORT || 3000;

// Configurations
const userAgent = process.env.USER_AGENT || 'Performance Weather Decision System (mubms@wisc.edu)';
const airNowApiKey = process.env.AIRNOW_API_KEY;
const lat = 43.07625; // Latitude for Memorial Union Terrace
const lon = -89.40006; // Longitude for Memorial Union Terrace

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

app.post('/getWeather', async (req, res) => {
    const { eventTime } = req.body;

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

        // Fetch weather data
        logger.info('Fetching weather data...');
        const { forecast, alerts } = await fetchWeatherData(lat, lon, userAgent, eventStartTime);
        logger.info('Weather data fetched successfully.');

        // Select the relevant forecast period
        const period = forecast;
        logger.info(`Selected forecast period: ${JSON.stringify(period)}`);

        // Parse forecast data
        const temp = period.temperature;
        const windSpeed = parseWindValue(period.windSpeed);
        const windGust = parseWindValue(period.windGust || '0 mph');
        const rainChance = extractRainChance(period.detailedForecast);
        const thunderstorm = /thunderstorm/i.test(period.shortForecast);

        logger.info(`Parsed forecast data for event: ${JSON.stringify({
            temp,
            windSpeed,
            windGust,
            rainChance,
            thunderstorm,
        })}`);

        // Parse alerts for tornado warnings
        const tornadoAlert = alerts.features?.some(alert =>
            alert.properties.event.toLowerCase().includes('tornado')
        ) || false;

        logger.info(`Tornado alert: ${tornadoAlert}`);

        // Fetch AQI data
        logger.info('Fetching AQI data...');
        const { aqi, airQuality } = await fetchAQI(lat, lon, airNowApiKey);
        logger.info(`AQI data fetched successfully: { aqi: ${aqi}, airQuality: ${airQuality} }`);

        // Calculate recommendations
        const recommendation = calculateRecommendation(temp, windSpeed, rainChance, thunderstorm, aqi);
        logger.info(`Recommendation calculated: ${JSON.stringify(recommendation)}`);

        // Format time range for display
        const periodStart = new Date(period.startTime);
        const periodEnd = new Date(period.endTime);
        const periodTimeRange = `${periodStart.toLocaleString()} to ${periodEnd.toLocaleString()}`;

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
            shortForecast: period.shortForecast
        };

        logger.info(`Final response sent to frontend: ${JSON.stringify(response)}`);
        res.json(response);
    } catch (error) {
        logger.error(`Error during weather or AQI processing: ${error.message || error}`);
        res.status(500).send({ error: error.message || 'Error fetching weather or AQI data.' });
    }
});

function parseWindValue(windStr) {
    const numbers = windStr.match(/\d+/g);
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
    logger.info(`Weather Call server running on port ${port}`);
});