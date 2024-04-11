const searchInput = document.querySelector('#search-input');
const searchBtn = document.querySelector('#search-btn');
const searchResults = document.querySelector('#search-results');

searchBtn.addEventListener('click', searchAnimals);

const endpoint = "https://api.api-ninjas.com/v1/animals";
const apiKey = "vOhy5jr7U0E4JuDdlNSstQ==6xCdqOaB2NagoQf5";

function searchAnimals() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        alert("Please enter a search term");
        return;
    }

    $.ajax({
        method: 'GET',
        url: endpoint,
        headers: { 'X-Api-Key': apiKey },
        data: { name: searchTerm },
        contentType: 'application/json',
        success: function(result) {
            if (result.length === 0) {
                alert("No results found for the search term");
            } else {
                const randomIndex = Math.floor(Math.random() * result.length);
                displaySearchResults(result[randomIndex]);
            }
        },
        error: function(jqXHR) {
            console.error('Error: ', jqXHR.responseText);
            if (jqXHR.status === 404) {
                alert("No results found for the search term");
            } else {
                alert("Failed to fetch search results");
            }
        }
    });
}

function displaySearchResults(animal) {
    searchResults.innerHTML = '';
    const characteristics = animal.characteristics;

    const factDiv = document.createElement('div');
    factDiv.innerHTML = `
        <p><strong>Common Name:</strong> ${characteristics.common_name}</p>
        <p><strong>Slogan:</strong> ${characteristics.slogan}</p>
        <p><strong>Biggest Threat:</strong> ${characteristics.biggest_threat}</p>
        <p><strong>Habitat:</strong> ${characteristics.habitat}</p>
        <p><strong>Diet:</strong> ${characteristics.diet}</p>
        <p><strong>Top Speed:</strong> ${characteristics.top_speed}</p>
        <p><strong>Lifespan:</strong> ${characteristics.lifespan}</p>
        <p><strong>Weight:</strong> ${characteristics.weight}</p>
        <p><strong>Height:</strong> ${characteristics.height}</p>
    `;
    searchResults.appendChild(factDiv);

    document.querySelector('#js-quote-text').textContent = animal.name;
}