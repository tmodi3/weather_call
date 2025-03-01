# Weather Decision App

A responsive web application that helps determine whether events should be held indoors or outdoors based on current weather conditions. This tool analyzes weather parameters and provides recommendations for event locations.

![Weather Decision App Screenshot](https://via.placeholder.com/800x450/f5f7fa/333.png?text=Weather+Decision+App)

## Features

- Real-time weather data retrieval from the National Weather Service (NWS) API
- Air Quality Index data from AirNow API
- Sophisticated weather condition analysis for decision-making
- Voting system for dining, program, and facilities representatives
- Mobile-responsive design for use on any device

## Weather Parameters Analyzed

The app analyzes multiple weather parameters to make informed recommendations:

- **Temperature**: Evaluates comfort levels for outdoor events
- **Wind Speed & Gusts**: Determines safety for outdoor structures
- **Rain Chance**: Predicts precipitation likelihood
- **Thunderstorm Alerts**: Monitors for severe weather threats
- **Tornado Warnings**: Detects active tornado warnings in the area
- **Air Quality Index**: Assesses health risks from air pollution

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Local Development

1. Clone the repository:
   ```
   git clone <repository-url>
   cd weather-decision-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   AIRNOW_API_KEY=your_airnow_api_key_here
   PORT=3000
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Deployment

### Deploy to Render (Free Tier)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Use the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Add Environment Variables**: Add your `AIRNOW_API_KEY`

### Deploy to Vercel (Free Tier)

1. Create a new project on [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Node.js
   - **Build Command**: `npm install`
   - **Output Directory**: (leave empty)
   - **Development Command**: `npm start`
   - **Environment Variables**: Add your `AIRNOW_API_KEY`

## API Documentation

### NWS (National Weather Service) API
- No API key required, but a User-Agent header must be provided
- Used for retrieving detailed weather forecast data
- More info: https://www.weather.gov/documentation/services-web-api

### AirNow API
- Requires an API key (get one at https://docs.airnowapi.org/)
- Used for obtaining current air quality data
- Free tier limited to 500 calls per day

## Decision Logic

The app uses a scoring system to determine recommendations:

### Weather Scoring

| Parameter | Condition | Score |
|-----------|-----------|-------|
| Temperature | ≤ 58°F | -2 |
|  | ≤ 65°F | -1 |
| Wind Speed | ≥ 44.7 mph | -2 |
|  | ≥ 33.5 mph | -1 |
| Rain Chance | ≥ 95% | -2 |
|  | ≥ 80% | -1 |
| Thunderstorm | Present | -2 |
| AQI | ≥ 151 | -2 |
|  | ≥ 101 | -1 |

### Recommendation Determination

- Score ≤ -5: "Bad" → Inside
- Score ≤ -2: "Marginal" → Depends
- Otherwise: "Great" → Outside

### Voting System

Representatives from three departments can vote:
- If 2+ votes for "Outside": Final decision is "Outside"
- If 2+ votes for "Inside": Final decision is "Inside"
- Otherwise: Final decision is "Depends"

## License

This project is licensed under the ISC License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.