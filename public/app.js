// app.js

// Set the current time in the input field when page loads
document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('currentTime').value = `${hours}:${minutes}`;
    console.log('Page loaded. Current time set to:', `${hours}:${minutes}`);
});

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
        console.log('Sending request to /getWeather with currentTime...');
        const response = await fetch('/getWeather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventTime: currentTime }),
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
        
        // Show forecast period
        if (data.forecastPeriod) {
            document.getElementById('forecastPeriod').textContent = data.forecastPeriod;
            document.getElementById('forecastTime').textContent = data.forecastTime || '';
            document.getElementById('forecastSection').style.display = 'block';
        } else {
            document.getElementById('forecastSection').style.display = 'none';
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