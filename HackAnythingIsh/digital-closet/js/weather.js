// Weather API Functions

async function getWeather() {
    console.log('Requesting location for weather...');

    // Update UI to show loading state
    document.getElementById('weatherIcon').textContent = '⏳';
    document.getElementById('weatherText').textContent = 'Loading...';

    // Detect Safari for specific handling
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (!navigator.geolocation) {
        console.warn('Geolocation not supported by this browser');
        alert('Location services not supported by your browser. Using default weather.');
        useDefaultWeather();
        return;
    }

    // Safari often doesn't support permissions API for geolocation
    if (!isSafari && !isIOS && navigator.permissions) {
        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            console.log('Geolocation permission status:', permission.state);

            if (permission.state === 'denied') {
                console.warn('Location access permanently denied');
                alert('Location access is blocked. Please enable location services in your browser settings, then refresh the page.');
                useDefaultWeather();
                return;
            }
        } catch (e) {
            console.log('Permission API not available, proceeding with location request');
        }
    }

    // Safari-specific options (more generous timeout, less accuracy)
    const options = isSafari || isIOS ? {
        enableHighAccuracy: false,
        timeout: 15000, // Longer timeout for Safari
        maximumAge: 600000 // 10 minutes cache for Safari
    } : {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
    };

    console.log('Location options:', options, { isSafari, isIOS });

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            console.log('Location obtained:', position.coords);

            try {
                // Use OpenWeatherMap API (free tier)
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Get location name using reverse geocoding first to determine country
                const geoResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                const geoData = await geoResponse.json();

                // Check if location is in the United States
                const isUS = geoData.countryCode === 'US';
                const temperatureUnit = isUS ? 'fahrenheit' : 'celsius';

                // Use free weather API with appropriate temperature unit
                const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=${temperatureUnit}&timezone=auto`);
                const weatherData = await weatherResponse.json();

                const weatherCondition = getWeatherCondition(weatherData.current_weather.weathercode);

                const realWeather = {
                    temperature: Math.round(weatherData.current_weather.temperature),
                    temperatureUnit: isUS ? '°F' : '°C',
                    condition: weatherCondition,
                    location: geoData.city ? `${geoData.city}, ${geoData.countryName}` : `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
                    windSpeed: weatherData.current_weather.windspeed
                };

                currentWeather = realWeather;
                updateWeatherDisplay();
                console.log('Real weather updated based on location:', currentWeather);
            } catch (apiError) {
                console.error('Weather API error:', apiError);
                // Fallback to mock data if API fails
                const mockWeather = {
                    temperature: Math.round(60 + Math.random() * 30),
                    temperatureUnit: '°F',
                    condition: ['sunny', 'cloudy', 'rainy', 'partly-cloudy'][Math.floor(Math.random() * 4)],
                    location: `Location (${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)})`
                };
                currentWeather = mockWeather;
                updateWeatherDisplay();
                console.log('Fallback weather used:', currentWeather);
            }
        },
        (error) => {
            console.error('Location error:', error);
            let message = '';

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    if (isSafari || isIOS) {
                        message = 'Safari Location Access: Please tap the "aA" button in Safari\'s address bar, select "Website Settings", and allow location access. Then refresh the page.';
                    } else {
                        message = 'Location access denied. Enable location services and refresh to get weather-based recommendations.';
                    }
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Location information unavailable. Using default weather.';
                    break;
                case error.TIMEOUT:
                    if (isSafari || isIOS) {
                        message = 'Location request timed out on Safari. This is common - using default weather.';
                    } else {
                        message = 'Location request timed out. Using default weather.';
                    }
                    break;
                default:
                    message = 'Unknown location error. Using default weather.';
                    break;
            }

            console.warn(message);
            alert(message);
            useDefaultWeather();
        },
        options
    );
}

// Map weather codes to conditions
function getWeatherCondition(weathercode) {
    const codeMap = {
        0: 'sunny',
        1: 'sunny',
        2: 'partly-cloudy',
        3: 'cloudy',
        45: 'cloudy',
        48: 'cloudy',
        51: 'rainy',
        53: 'rainy',
        55: 'rainy',
        56: 'rainy',
        57: 'rainy',
        61: 'rainy',
        63: 'rainy',
        65: 'rainy',
        66: 'rainy',
        67: 'rainy',
        71: 'snowy',
        73: 'snowy',
        75: 'snowy',
        77: 'snowy',
        80: 'rainy',
        81: 'rainy',
        82: 'rainy',
        85: 'snowy',
        86: 'snowy',
        95: 'stormy',
        96: 'stormy',
        99: 'stormy'
    };
    return codeMap[weathercode] || 'cloudy';
}

function useDefaultWeather() {
    currentWeather = {
        temperature: 72,
        temperatureUnit: '°F',
        condition: 'partly-cloudy',
        location: 'Default Location'
    };
    updateWeatherDisplay();
    console.log('Using default weather:', currentWeather);
}

function updateWeatherDisplay() {
    const iconMap = {
        'sunny': '☀️',
        'cloudy': '☁️',
        'rainy': '🌧️',
        'partly-cloudy': '⛅',
        'snowy': '❄️',
        'stormy': '⛈️'
    };

    document.getElementById('weatherIcon').textContent = iconMap[currentWeather.condition] || '🌤️';
    const tempUnit = currentWeather.temperatureUnit || '°C';
    document.getElementById('weatherText').textContent = `${currentWeather.temperature}${tempUnit}`;

    // Update weather info panel
    const weatherInfo = document.getElementById('weatherInfo');
    const weatherDetails = document.getElementById('weatherDetails');

    weatherInfo.classList.remove('hidden');
    weatherDetails.innerHTML = `
        <p><strong>${currentWeather.temperature}${tempUnit}</strong> - ${currentWeather.condition.replace('-', ' ')}</p>
        ${currentWeather.location ? `<p class="text-xs mt-1">📍 ${currentWeather.location}</p>` : ''}
        <p class="text-xs mt-1">Smart outfit will consider weather conditions</p>
    `;
}
