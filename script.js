// Ensure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    // !!! REPLACE THIS WITH THE ACTUAL URL VERCEL GIVES YOU AFTER DEPLOYING YOUR BACKEND !!!
    // For local testing, you might use 'http://localhost:3000'
    const YOUR_BACKEND_BASE_URL = 'https://YOUR-VERCEL-BACKEND-URL.vercel.app';

    // --- Element References ---
    const searchInput = document.getElementById('searchQuery');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');

    // Player Elements
    const playerSection = document.getElementById('playerSection');
    const soundcloudEmbedContainer = document.getElementById('soundcloudEmbed');
    const playerArtwork = document.getElementById('playerArtwork');
    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playerPermalink = document.getElementById('playerPermalink');

    // --- Helper Functions ---

    function clearResultsAndErrors() {
        resultsContainer.innerHTML = '';
        errorDisplay.style.display = 'none';
        errorDisplay.textContent = '';
         // Keep player section visible if a track is loaded
    }

    function showLoading() {
        loadingIndicator.style.display = 'block';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function displayError(message) {
        errorDisplay.textContent = `Error: ${message}`;
        errorDisplay.style.display = 'block';
        console.error("Displayed Error:", message); // Log to console as well
    }

     // Function to load a track into the player and update details
    function loadTrackIntoPlayer(track) {
        // Show the player section
        playerSection.style.display = 'flex'; // Use flex as per CSS

        // Update track details display
        playerArtwork.src = track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : 'https://via.placeholder.com/100x100.png?text=No+Art'; // Get larger art for player
        playerArtwork.alt = `${track.title} Artwork`;
        playerTitle.textContent = track.title;
        playerArtist.textContent = track.user ? track.user.username : 'Unknown Artist';
        playerPermalink.href = track.permalink_url;

        // Load the track into the SoundCloud embed widget
        // The embed uses the permalink_url
        const embedOptions = {
            auto_play: true, // Start playback automatically
            color: 'ff5500', // SoundCloud orange
            // Add other options like show_comments, show_user, show_reposts, show_teaser, show_artwork, show_playcount, show_waveform
            show_artwork: true,
            show_playcount: false,
            show_waveform: true,
            visual: false // Set to true for the large visual player
        };

        // Clear previous embed
        soundcloudEmbedContainer.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.width = "100%";
        // Height depends on 'visual' option. Standard is 166, visual is 300 or more.
        iframe.height = embedOptions.visual ? "300" : "166";
        iframe.scrolling = "no";
        iframe.frameborder = "no";
        iframe.allow = "autoplay"; // Important for auto_play attribute
        iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.permalink_url)}&${new URLSearchParams(embedOptions).toString()}`;

        soundcloudEmbedContainer.appendChild(iframe);

        // Optional: If you want to interact with the embed using the API, get the widget instance.
        // This requires the SoundCloud iFrame API script included in HTML.
        // let widget = SC.Widget(iframe);
        // widget.bind(SC.Widget.Events.READY, () => {
        //     console.log('SoundCloud widget ready');
        //     // Now you can interact with the widget using methods like widget.play(), widget.pause() etc.
        // });
         // Bind other events (PLAY, PAUSE, FINISH, SEEK, etc.) if needed for custom controls

        // Scroll to the player section
        playerSection.scrollIntoView({ behavior: 'smooth' });
    }


    // Function to create and append a single track result element
    function displayTrackResult(track) {
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');
        // Store the track data on the element for easy access later
        // Use a data attribute for storing the track object
        resultItem.dataset.track = JSON.stringify(track);

        const artworkUrl = track.artwork_url ?
                           track.artwork_url.replace('-large', '-badge') : // Get a smaller size for the list
                           'https://via.placeholder.com/60x60.png?text=No+Art';

        resultItem.innerHTML = `
            <div class="track-artwork">
                <img src="${artworkUrl}" alt="${track.title} Artwork">
            </div>
            <div class="track-info">
                <h3>${track.title}</h3>
                <p>${track.user ? track.user.username : 'Unknown Artist'}</p>
            </div>
            <!-- track-link div is hidden by CSS now -->
        `;

        // Add click event listener to each result item
        resultItem.addEventListener('click', () => {
            const clickedTrack = JSON.parse(resultItem.dataset.track);
            loadTrackIntoPlayer(clickedTrack);
        });

        resultsContainer.appendChild(resultItem);
    }

    // --- API Call Function (Calls YOUR Backend) ---

    async function searchSoundCloud(query) {
        clearResultsAndErrors(); // Clear previous results and errors
        showLoading(); // Show loading indicator

        if (!query) {
            displayError("Please enter a search query.");
            hideLoading();
            resultsContainer.innerHTML = '<p class="placeholder">Search for something to see results!</p>'; // Put placeholder back
            return; // Stop execution
        }

        // Construct the URL to YOUR backend's search endpoint
        const requestUrl = `${YOUR_BACKEND_BASE_URL}/api/search?q=${encodeURIComponent(query)}`;

        console.log("Fetching search results from backend:", requestUrl);

        try {
            // Fetch data from YOUR backend
            const response = await fetch(requestUrl);

            if (!response.ok) {
                 // Try reading backend's error response
                 let errorDetail = `Backend returned status: ${response.status}`;
                 try {
                     const errorData = await response.json();
                     if (errorData.error) {
                         errorDetail = `Backend Error: ${errorData.error}`;
                         if (errorData.details) errorDetail += ` - ${errorData.details}`;
                     } else {
                          errorDetail += ` - ${JSON.stringify(errorData)}`; // Show raw error if not in expected format
                     }
                 } catch (e) {
                     // If backend response is not JSON, get text
                     try {
                         const errorText = await response.text();
                         errorDetail += ` - ${errorText.substring(0, 200)}...`;
                     } catch(e) {
                         // Cannot read response body
                     }
                 }

                 displayError(`Search failed: ${errorDetail}`);
                 // Clear results container with a message if there was an error fetching results
                 resultsContainer.innerHTML = '<p class="placeholder">Failed to load search results.</p>';
                 return; // Stop here on backend error
            }

            // Parse the JSON response from YOUR backend (which should be SoundCloud data)
            const data = await response.json();
            console.log("Received data from backend:", data);


            if (data.length === 0) {
                resultsContainer.innerHTML = '<p class="placeholder">No tracks found for this query.</p>';
                return; // Stop here if no results
            }

            // Process and display the results
            data.forEach(track => {
                // Basic validation to ensure essential data exists for display/playback
                if (track && track.title && track.user && track.user.username && track.permalink_url) {
                     displayTrackResult(track);
                } else {
                    console.warn("Skipping track due to missing required info:", track);
                    // Optionally display a message to the user about malformed result
                }
            });

        } catch (error) {
            // Handle network errors or other unexpected issues during fetch from YOUR backend
            console.error("Frontend fetch error calling backend:", error);
            displayError(`An unexpected error occurred while fetching results: ${error.message}. Check console for details.`);
             // Clear results container with a message if there was a critical error
            resultsContainer.innerHTML = '<p class="placeholder">Failed to load search results due to a connection issue.</p>';
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

    // Optional: Add a listener to clear error message when input changes
    searchInput.addEventListener('input', () => {
        errorDisplay.style.display = 'none';
        errorDisplay.textContent = '';
    });


}); // End of DOMContentLoaded
