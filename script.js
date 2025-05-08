// Ensure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // --- Constants and Elements ---
    const CLIENT_ID = 'f6k2kBKdKxsBaJCEeHQHScqQLINy5UUN'; // Your provided Client ID
    const BASE_API_URL = 'https://api.soundcloud.com/';
    const searchInput = document.getElementById('searchQuery');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');

    // --- Helper Functions ---

    // Function to clear previous results and error messages
    function clearResultsAndErrors() {
        resultsContainer.innerHTML = ''; // Clear HTML inside the results container
        errorDisplay.style.display = 'none'; // Hide error message
        errorDisplay.textContent = ''; // Clear error message text
    }

    // Function to show a loading indicator
    function showLoading() {
        loadingIndicator.style.display = 'block';
    }

    // Function to hide the loading indicator
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // Function to display an error message to the user
    function displayError(message) {
        errorDisplay.textContent = `Error: ${message}`;
        errorDisplay.style.display = 'block';
    }

    // Function to create and append a single track result element
    function displayTrackResult(track) {
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item'); // Add CSS class for styling

        const artworkUrl = track.artwork_url ?
                           track.artwork_url.replace('-large', '-badge') : // Get a smaller size if available
                           'https://via.placeholder.com/60x60.png?text=No+Art'; // Placeholder if no artwork

        resultItem.innerHTML = `
            <div class="track-artwork">
                <img src="${artworkUrl}" alt="${track.title} Artwork">
            </div>
            <div class="track-info">
                <h3>${track.title}</h3>
                <p>${track.user ? track.user.username : 'Unknown Artist'}</p>
            </div>
            <div class="track-link">
                <a href="${track.permalink_url}" target="_blank">Listen on SoundCloud</a>
            </div>
        `;
        resultsContainer.appendChild(resultItem); // Add the created element to the results container
    }

    // --- API Call Function ---

    async function searchSoundCloud(query) {
        clearResultsAndErrors(); // Clear previous state
        showLoading(); // Show loading indicator

        // Basic validation
        if (!query) {
            displayError("Please enter a search query.");
            hideLoading();
            resultsContainer.innerHTML = '<p class="placeholder">Search for something to see results!</p>';
            return; // Stop execution
        }

        // Construct the API URL
        // Use encodeURIComponent to handle spaces and special characters in the query
        const requestUrl = `${BASE_API_URL}tracks?q=${encodeURIComponent(query)}&client_id=${CLIENT_ID}`;

        try {
            // Fetch data from the SoundCloud API
            const response = await fetch(requestUrl);

            // --- Error Handling (Referencing your link: https://developers.soundcloud.com/docs/api/reference#errors) ---
            if (!response.ok) { // Check for non-2xx status codes
                let errorMessage = `HTTP error! status: ${response.status}`;

                // Attempt to read the response body for more specific error details
                try {
                    const errorBody = await response.json(); // API might return JSON errors
                    if (errorBody && errorBody.errors && errorBody.errors.length > 0) {
                        errorMessage = `API Error: ${errorBody.errors[0].message} (Code: ${errorBody.errors[0].error_code || response.status})`;
                         // Check specific known codes, though public API errors are often generic
                        if (response.status === 401 || response.status === 403) {
                            errorMessage = "Authentication or Permission Error. Please check the Client ID or API access.";
                        } else if (response.status === 404) {
                             errorMessage = "Resource not found."; // Less likely for search, but possible
                        }
                         // Add more checks based on specific codes if needed
                    } else {
                         // Fallback to reading text if not JSON or unexpected structure
                         const errorText = await response.text();
                         errorMessage = `API Error: ${response.status} - ${errorText.substring(0, 100)}...`; // Show part of the text
                    }
                } catch (e) {
                    // If reading body as JSON fails, just use the status code
                    console.error("Failed to parse error body as JSON:", e);
                    errorMessage = `HTTP error! status: ${response.status}`;
                }

                displayError(errorMessage); // Show the error message to the user
                return; // Stop here on API error
            }
            // --- End Error Handling ---

            // Parse the JSON response
            const data = await response.json();

            // Check if results are empty
            if (data.length === 0) {
                resultsContainer.innerHTML = '<p class="placeholder">No tracks found for this query.</p>';
                return; // Stop here
            }

            // Process and display the results
            data.forEach(track => {
                // Ensure track object has necessary properties before displaying
                if (track.title && track.user && track.user.username && track.permalink_url) {
                     displayTrackResult(track);
                } else {
                    console.warn("Skipping track due to missing required info:", track);
                }
            });

        } catch (error) {
            // Handle network errors or other unexpected issues
            console.error("Fetch error:", error);
            displayError(`Could not connect to API or process data: ${error.message}`);
        } finally {
            // Hide loading indicator regardless of success or failure
            hideLoading();
        }
    }

    // --- Event Listeners ---

    // Listen for button click
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim(); // Get input value and remove leading/trailing whitespace
        searchSoundCloud(query); // Perform the search
    });

    // Listen for 'Enter' key press in the input field
    searchInput.addEventListener('keypress', (event) => {
        // Check if the pressed key was 'Enter'
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission if inside a form
            searchButton.click(); // Simulate a button click
        }
    });

}); // End of DOMContentLoaded
