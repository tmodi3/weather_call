# Weather Decision App

A responsive web application that determines whether events should be held indoors or outdoors based on real-time weather conditions. This application uses the OpenWeather API to fetch current weather data for the user's location and provides a recommendation based on multiple weather parameters.

![Weather Decision App Screenshot](https://via.placeholder.com/800x450/f5f7fa/333.png?text=Weather+Decision+App)

## Features

- Automatic detection of user's location using browser geolocation or IP-based fallback
- Real-time weather data from OpenWeather API
- Air Quality Index data from AirNow API
- Weather condition analysis and location-specific recommendations
- Voting system for different departments (dining, program, facilities)
- Mobile-responsive design for any device
- Weather icons and detailed forecast display

## Weather Parameters Analyzed

The app analyzes multiple weather parameters to make informed recommendations:

- **Temperature**: Evaluates comfort levels for outdoor events
- **Wind Speed & Gusts**: Determines safety for outdoor structures
- **Chance of Rain**: Calculated based on cloud cover, humidity, and precipitation
- **Thunderstorm Detection**: Monitors for severe weather threats
- **Air Quality Index**: Assesses health risks from air pollution

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/tmodi3/weather_call.git
   cd weather_call
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   OPENWEATHER_API_KEY=your_openweather_api_key
   AIRNOW_API_KEY=your_airnow_api_key
   PORT=3000
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Deployment to Render (Free Tier)

1. Create a Render account at [render.com](https://render.com) if you don't have one

2. From your dashboard, click "New" and select "Web Service"

3. Connect to your GitHub repository or select "Deploy from GitHub"
   - You may need to authorize Render to access your GitHub account
   - Search for and select the repository "weather_call"

4. Configure your web service with the following settings:
   - **Name**: weather-decision-app (or any name you prefer)
   - **Environment**: Node
   - **Region**: Choose the closest to your target audience
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add environment variables:
   - Click "Advanced" and then "Add Environment Variable"
   - Add the following keys and values:
     - `OPENWEATHER_API_KEY`: your OpenWeather API key
     - `AIRNOW_API_KEY`: your AirNow API key

6. Click "Create Web Service"

7. Render will automatically build and deploy your application
   - The deployment may take a few minutes
   - You can view the build logs to track progress

8. Once deployed, you'll get a URL like `https://weather-decision-app.onrender.com`
   - This is your live application URL

9. Your app should now be accessible to anyone with internet access

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

## APIs Used

### OpenWeather API
- Used for current weather data
- Free tier allows up to 1,000 calls per day
- Documentation: [OpenWeather API Docs](https://openweathermap.org/api)

### AirNow API
- Used for air quality data
- Free tier allows up to 500 calls per day
- Documentation: [AirNow API Docs](https://docs.airnowapi.org/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.