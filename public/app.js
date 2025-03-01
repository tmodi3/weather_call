// app.js

// Global variables to store location info
let userLocation = {
    lat: null,
    lon: null,
    city: null,
    country: null
};

// Get user's location when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set the current time in the input field
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('currentTime').value = `${hours}:${minutes}`;
    console.log('Page loaded. Current time set to:', `${hours}:${minutes}`);
    
    // Try to get user's location
    getUserLocation();
});

// Function to get user's location
async function getUserLocation() {
    const locationDisplay = document.getElementById('locationDisplay');
    const locationStatus = document.getElementById('locationStatus');
    
    try {
        locationStatus.textContent = 'Detecting your location...';
        locationStatus.style.display = 'block';
        
        // First try browser geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async function(position) {
                    // Browser geolocation successful
                    userLocation.lat = position.coords.latitude;
                    userLocation.lon = position.coords.longitude;
                    
                    console.log(`Got browser location: ${userLocation.lat}, ${userLocation.lon}`);
                    
                    // Get location name from coordinates
                    await fetchLocationInfo();
                    
                    locationStatus.style.display = 'none';
                    updateLocationDisplay();
                },
                async function(error) {
                    // Browser geolocation failed, fallback to IP-based geolocation
                    console.warn(`Browser geolocation failed: ${error.message}`);
                    await fallbackToIPLocation();
                }
            );
        } else {
            // Browser doesn't support geolocation, fallback to IP-based geolocation
            console.warn('Browser does not support geolocation');
            await fallbackToIPLocation();
        }
    } catch (error) {
        console.error('Error getting location:', error);
        locationStatus.textContent = 'Using default location (Madison, WI)';
        locationStatus.className = 'text-warning';
    }
}

// Fallback to IP-based geolocation
async function fallbackToIPLocation() {
    try {
        const locationStatus = document.getElementById('locationStatus');
        locationStatus.textContent = 'Using IP-based location...';
        
        const response = await fetch('/getLocation');
        if (!response.ok) {
            throw new Error('Failed to fetch location from server');
        }
        
        const data = await response.json();
        console.log('IP location data:', data);
        
        userLocation = {
            lat: data.lat,
            lon: data.lon,
            city: data.city,
            region: data.region,
            country: data.country,
            countryCode: data.countryCode
        };
        
        updateLocationDisplay();
        locationStatus.style.display = 'none';
    } catch (error) {
        console.error('Error getting IP location:', error);
        const locationStatus = document.getElementById('locationStatus');
        locationStatus.textContent = 'Using default location (Madison, WI)';
        locationStatus.className = 'text-warning';
    }
}

// Fetch location info from coordinates
async function fetchLocationInfo() {
    if (!userLocation.lat || !userLocation.lon) return;
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lon}&format=json`, {
            headers: {
                'User-Agent': 'Weather Decision App'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch location info');
        }
        
        const data = await response.json();
        console.log('Location info:', data);
        
        userLocation.city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
        userLocation.region = data.address.state || '';
        userLocation.country = data.address.country || '';
        userLocation.countryCode = data.address.country_code?.toUpperCase() || '';
    } catch (error) {
        console.error('Error fetching location info:', error);
    }
}

// Update location display in the UI
function updateLocationDisplay() {
    const locationDisplay = document.getElementById('locationDisplay');
    if (!locationDisplay) return;
    
    if (userLocation.city) {
        const displayText = userLocation.country 
            ? `${userLocation.city}, ${userLocation.country}` 
            : userLocation.city;
            
        locationDisplay.textContent = displayText;
        locationDisplay.style.display = 'block';
    } else {
        locationDisplay.style.display = 'none';
    }
}

// Weather form submission
document.getElementById('weatherForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const currentTime = document.getElementById('currentTime').value;
    const submitButton = document.getElementById('weatherSubmitButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');

    console.log(`Weather form submitted. Current Time: ${currentTime}`);
    submitButton.disabled = true;
    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    
    // Hide previous results until new data is loaded
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('votesSection').style.display = 'none';

    try {
        console.log('Sending request to /getWeather with currentTime and location...');
        const requestBody = { 
            eventTime: currentTime,
            lat: userLocation.lat,
            lon: userLocation.lon,
            city: userLocation.city,
            country: userLocation.country
        };
        
        console.log('Request body:', requestBody);
        
        const response = await fetch('/getWeather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error in response:', response.status, errorData);
            throw new Error(errorData.error || 'Failed to fetch weather data.');
        }

        const data = await response.json();
        console.log('Weather API response received:', data);

        // Update the UI with the fetched data
        document.getElementById('thunderstormAlert').textContent = data.thunderstormAlert;
        document.getElementById('tornadoAlert').textContent = data.tornadoAlert;
        document.getElementById('airQuality').textContent = data.airQuality || 'Unavailable';
        document.getElementById('temperature').textContent = data.temperature;
        document.getElementById('rainChance').textContent = data.rainChance;
        document.getElementById('windSpeed').textContent = data.windSpeed;
        document.getElementById('windGust').textContent = data.windGust;
        
        // Update location if available
        if (data.location) {
            document.getElementById('weatherLocation').textContent = data.location;
            document.getElementById('locationInfo').style.display = 'block';
        } else {
            document.getElementById('locationInfo').style.display = 'none';
        }
        
        // Show forecast period
        if (data.forecastPeriod) {
            document.getElementById('forecastPeriod').textContent = data.forecastPeriod;
            document.getElementById('forecastTime').textContent = data.forecastTime || '';
            document.getElementById('forecastSection').style.display = 'block';
        } else {
            document.getElementById('forecastSection').style.display = 'none';
        }
        
        // Show weather icon if available
        if (data.weatherIcon) {
            const iconUrl = `https://openweathermap.org/img/wn/${data.weatherIcon}@2x.png`;
            document.getElementById('weatherIcon').src = iconUrl;
            document.getElementById('weatherIcon').style.display = 'inline-block';
        } else {
            document.getElementById('weatherIcon').style.display = 'none';
        }
        
        // Show weather description if available
        if (data.shortForecast) {
            document.getElementById('weatherDescription').textContent = data.shortForecast;
            document.getElementById('weatherDescription').style.display = 'block';
        } else {
            document.getElementById('weatherDescription').style.display = 'none';
        }
        
        // Update recommendation with color coding
        const recommendationElement = document.getElementById('weatherRecommendation');
        recommendationElement.textContent = data.recommendation || 'No recommendation';
        
        // Apply color based on recommendation
        if (data.recommendation === 'Great') {
            recommendationElement.className = 'lead text-success';
        } else if (data.recommendation === 'Marginal') {
            recommendationElement.className = 'lead text-warning';
        } else if (data.recommendation === 'Bad') {
            recommendationElement.className = 'lead text-danger';
        } else {
            recommendationElement.className = 'lead';
        }
        
        // Show score details if available
        if (data.scoreDetails && data.scoreDetails.length > 0) {
            const scoreDetailsElement = document.getElementById('scoreDetails');
            scoreDetailsElement.innerHTML = '';
            
            data.scoreDetails.forEach(detail => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item py-1';
                listItem.textContent = detail;
                scoreDetailsElement.appendChild(listItem);
            });
            
            document.getElementById('scoreDetailsSection').style.display = 'block';
        } else {
            document.getElementById('scoreDetailsSection').style.display = 'none';
        }

        console.log('Updating UI with received weather data...');
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('votesSection').style.display = 'block';
        
        // Reset votes display
        document.getElementById('diningVoteResult').textContent = '-';
        document.getElementById('programVoteResult').textContent = '-';
        document.getElementById('facilitiesVoteResult').textContent = '-';
        document.getElementById('finalDecision').textContent = '-';
        document.getElementById('finalDecision').className = '';
        
    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        errorMessage.textContent = error.message || 'Error fetching weather data. Please try again.';
        errorMessage.style.display = 'block';
    } finally {
        submitButton.disabled = false;
        loadingIndicator.style.display = 'none';
        console.log('Weather request completed. Submit button re-enabled.');
    }
});

// Voting form submission
document.getElementById('voteForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const diningVote = document.getElementById('diningVote').value;
    const programVote = document.getElementById('programVote').value;
    const facilitiesVote = document.getElementById('facilitiesVote').value;
    const submitButton = document.getElementById('voteSubmitButton');
    const voteErrorMessage = document.getElementById('voteErrorMessage');

    console.log('Vote form submitted with values:', { diningVote, programVote, facilitiesVote });
    submitButton.disabled = true;
    voteErrorMessage.style.display = 'none';

    try {
        const response = await fetch('/submitVotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diningVote, programVote, facilitiesVote }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error in response:', response.status, errorData);
            throw new Error(errorData.error || 'Failed to submit votes.');
        }

        const data = await response.json();

        // Update UI with the response
        document.getElementById('diningVoteResult').textContent = data.diningVote;
        document.getElementById('programVoteResult').textContent = data.programVote;
        document.getElementById('facilitiesVoteResult').textContent = data.facilitiesVote;
        
        const finalDecisionElement = document.getElementById('finalDecision');
        finalDecisionElement.textContent = data.finalDecision;
        
        // Apply color based on final decision
        if (data.finalDecision === 'Outside') {
            finalDecisionElement.className = 'font-weight-bold text-success';
        } else if (data.finalDecision === 'Inside') {
            finalDecisionElement.className = 'font-weight-bold text-danger';
        } else {
            finalDecisionElement.className = 'font-weight-bold text-warning';
        }

        console.log('Votes processed successfully:', data);
    } catch (error) {
        console.error('Error submitting votes:', error.message);
        voteErrorMessage.textContent = error.message || 'Error submitting votes. Please try again.';
        voteErrorMessage.style.display = 'block';
    } finally {
        submitButton.disabled = false;
    }
});