// CodeSync_test/js/main.js
import { Auth } from 'aws-amplify';
import './amplify_config.js'; // Import your Amplify configuration

// --- Shared Authentication Logic ---
let currentAuthToken = null;

async function checkAuthAndDisplayUser() {
    console.log("checkAuthAndDisplayUser called.");
    try {
        const user = await Auth.currentAuthenticatedUser();
        currentAuthToken = user.signInUserSession.idToken.jwtToken;
        const displayUsernameElement = document.getElementById('displayUsername');
        if (displayUsernameElement) {
            displayUsernameElement.textContent = user.username || user.attributes.email;
            console.log("User authenticated:", user.username || user.attributes.email);
        }

        // If on results page, trigger stats display after auth check
        if (document.getElementById('results')) {
            console.log("On results page, calling displayStats.");
            displayStats();
        }
    } catch (error) {
        console.error('User not authenticated or auth check failed:', error);
        console.log("Redirecting to index.html (login page).");
        window.location.href = 'index.html'; // Redirect to the new login page
    }
}

async function handleLogout() {
    console.log("handleLogout called.");
    try {
        await Auth.signOut();
        console.log("User signed out. Redirecting to index.html.");
        window.location.href = 'index.html'; // Redirect to the new login page
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Toggle user menu dropdown and handle page protection
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded in main.js");
    try {
        const userMenuButton = document.getElementById('userMenuButton');
        if (userMenuButton) { // Ensure button exists on the page (usernames.html, results.html)
            userMenuButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent document click from closing immediately
                const userMenu = document.getElementById('userMenu');
                if (userMenu) { // Ensure userMenu exists
                    userMenu.classList.toggle('hidden');
                    console.log("User menu button clicked, toggling visibility.");
                }
            });

            // Close dropdown if clicked outside
            window.addEventListener('click', (event) => {
                const userMenu = document.getElementById('userMenu');
                if (userMenu && !userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
                    if (!userMenu.classList.contains('hidden')) {
                        userMenu.classList.add('hidden');
                        console.log("Clicked outside user menu, hiding it.");
                    }
                }
            });
        }

        // Call authentication check on load for protected pages only
        // Protected pages are now usernames.html and results.html (identified by id="protected-page")
        if (document.body.id === 'protected-page') {
            console.log("Current page is protected, initiating auth check.");
            checkAuthAndDisplayUser();
        } else {
            console.log("Current page is not protected (login/signup). No auth check on load.");
        }
    } catch (e) {
        console.error("Error during DOMContentLoaded setup in main.js:", e);
    }
});

// Make handleLogout accessible globally for onclick attributes
window.handleLogout = handleLogout;


// --- Logic Specific to index.html (Login Page) and signup.html ---
// These functions are for the new index.html (login page) and signup.html
if (document.getElementById('loginForm') || document.getElementById('signupForm')) { // Check if on login or signup pages
    console.log("Loading login/signup page specific JS.");
    const loginForm = document.getElementById('loginForm');
    const confirmForm = document.getElementById('confirmForm');
    const errorMessageDiv = document.getElementById("errorMessage"); // For login form errors
    const messageBox = document.getElementById('messageBox'); // For signup form messages
    const confirmMessageBox = document.getElementById('confirmMessageBox'); // For confirmation form messages


    function showMessage(element, message, isSuccess = true) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden', 'success-message', 'error-message');
            element.classList.add(isSuccess ? 'success-message' : 'error-message');
            console.log(`Message displayed on ${element.id}: ${message} (Success: ${isSuccess})`);
        }
    }

    async function handleLogin() {
        console.log("handleLogin called.");
        const username = document.getElementById("username")?.value.trim();
        const password = document.getElementById("password")?.value.trim();
        if (errorMessageDiv) errorMessageDiv.classList.add('hidden'); // Clear previous errors

        if (!username || !password) {
            if (errorMessageDiv) {
                errorMessageDiv.textContent = "Please enter both username/email and password.";
                errorMessageDiv.classList.remove('hidden');
            }
            console.log("Login: Missing username or password.");
            return;
        }

        try {
            await Auth.signIn({ username, password });
            console.log('User logged in successfully. Redirecting to usernames.html.');
            window.location.href = 'usernames.html'; // Redirect to the new input usernames page
        } catch (error) {
            console.error('Error logging in:', error);
            if (error.code === 'UserNotConfirmedException') {
                const confirmUsernameInput = document.getElementById('confirmUsername');
                if (confirmUsernameInput) confirmUsernameInput.value = username;

                if (loginForm) loginForm.classList.add('hidden');
                if (confirmForm) confirmForm.classList.remove('hidden');
                showMessage(confirmMessageBox, "Your account is not confirmed. Please enter the verification code sent to your email.", false);
                console.log("Login: User not confirmed.");
            } else {
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = error.message || "An unexpected error occurred during login.";
                    errorMessageDiv.classList.remove('hidden');
                }
                console.log("Login: Other error -", error.message);
            }
        }
    }

    async function handleSignUp() {
        console.log("handleSignUp called.");
        const username = document.getElementById("username")?.value.trim();
        const email = document.getElementById("email")?.value.trim();
        const password = document.getElementById("password")?.value.trim();
        if (messageBox) messageBox.classList.add('hidden');

        if (!username || !email || !password) {
            showMessage(messageBox, "Please fill in all fields.", false);
            console.log("Signup: Missing fields.");
            return;
        }

        try {
            const { user } = await Auth.signUp({
                username,
                password,
                attributes: { email }
            });
            console.log('User signed up successfully:', user);
            const confirmUsernameInput = document.getElementById('confirmUsername');
            if (confirmUsernameInput) confirmUsernameInput.value = username;
            
            const signupFormElement = document.getElementById('signupForm');
            const confirmFormElement = document.getElementById('confirmForm');

            if (signupFormElement) signupFormElement.classList.add('hidden');
            if (confirmFormElement) confirmFormElement.classList.remove('hidden');
            
            showMessage(confirmMessageBox, "Verification code sent to your email!", true);
            console.log("Signup: Verification code sent.");
        } catch (error) {
            console.error('Error signing up:', error);
            showMessage(messageBox, error.message || "An unexpected error occurred during sign-up.", false);
            console.log("Signup: Error -", error.message);
        }
    }

    async function handleConfirmSignUp() {
        console.log("handleConfirmSignUp called.");
        const username = document.getElementById("confirmUsername")?.value.trim();
        const code = document.getElementById("confirmationCode")?.value.trim();
        if (confirmMessageBox) confirmMessageBox.classList.add('hidden');

        if (!username || !code) {
            showMessage(confirmMessageBox, "Please enter username and confirmation code.", false);
            console.log("Confirm Signup: Missing username or code.");
            return;
        }

        try {
            await Auth.confirmSignUp({ username, confirmationCode: code });
            console.log('User confirmed successfully. Redirecting to index.html (login page).');
            showMessage(confirmMessageBox, "Account confirmed! Redirecting to login...", true);
            setTimeout(() => {
                window.location.href = 'index.html'; // Redirect back to the login page
            }, 2000);
        } catch (error) {
            console.error('Error confirming sign up:', error);
            showMessage(confirmMessageBox, error.message || "Error confirming account. Please check the code.", false);
            console.log("Confirm Signup: Error -", error.message);
        }
    }

    async function handleResendCode() {
        console.log("handleResendCode called.");
        const username = document.getElementById("confirmUsername")?.value.trim();
        if (confirmMessageBox) confirmMessageBox.classList.add('hidden');

        if (!username) {
            showMessage(confirmMessageBox, "Please enter your username to resend the code.", false);
            console.log("Resend Code: Missing username.");
            return;
        }

        try {
            await Auth.resendSignUpCode({ username });
            showMessage(confirmMessageBox, "New verification code sent!", true);
            console.log("Resend Code: New code sent.");
        } catch (error) {
            console.error('Error resending code:', error);
            showMessage(confirmMessageBox, error.message || "Error resending code.", false);
            console.log("Resend Code: Error -", error.message);
        }
    }

    // EXPOSE GLOBAL FUNCTIONS FOR ONCLICK ATTRIBUTES on index.html (login) and signup.html
    window.handleLogin = handleLogin;
    window.handleSignUp = handleSignUp;
    window.handleConfirmSignUp = handleConfirmSignUp;
    window.handleResendCode = handleResendCode;
}


// --- Logic Specific to usernames.html (Input Page) ---
// This block now specifically targets usernames.html
if (document.getElementById('leetcode')) { // Check if on the input page
    console.log("Loading usernames.html specific JS.");
    function toggleCheckmark(inputElement) {
        const checkId = inputElement.id + 'Check';
        const check = document.getElementById(checkId);
        if (check) {
            if (inputElement.value.trim()) {
                check.classList.add('checked');
            } else {
                check.classList.remove('checked');
            }
        }
    }

    // Function to navigate to the results page with query parameters
    function navigateToResults() {
        console.log("navigateToResults called.");
        const leetcode = document.getElementById("leetcode")?.value.trim();
        const codechef = document.getElementById("codechef")?.value.trim();
        const hackerrank = document.getElementById("hackerrank")?.value.trim();
        const gfg = document.getElementById("gfg")?.value.trim();

        const params = new URLSearchParams();
        if (leetcode) params.append('leetcode', leetcode);
        if (codechef) params.append('codechef', codechef);
        if (hackerrank) params.append('hackerrank', hackerrank);
        if (gfg) params.append('gfg', gfg);

        const redirectUrl = `results.html?${params.toString()}`;
        console.log("Redirecting to:", redirectUrl);
        window.location.href = redirectUrl;
    }

    // Make functions globally accessible for onclick attributes in usernames.html
    window.toggleCheckmark = toggleCheckmark;
    window.navigateToResults = navigateToResults;
}


// --- Logic Specific to results.html (Results Page) ---
if (document.getElementById('results')) { // Check if on the results page
    console.log("Loading results.html specific JS.");
    // Configuration for platform data
    const platformConfig = {
        leetcode: {
            name: "LeetCode",
            color: "leetcode-card",
            logo: "https://leetcode.com/static/images/LeetCode_logo_rvs.png",
            placeholder: "https://placehold.co/40x40/FBBF24/000000?text=LC",
            stats: [
                { label: "Problems Solved", key: "total_problems_solved", default: "N/A" },
                { label: "Contest Rating", key: "ranking", default: "N/A" },
                { label: "Easy Solved", key: "easy", default: 0 },
                { label: "Medium Solved", key: "medium", default: 0 },
                { label: "Hard Solved", key: 0 }
            ]
        },
        gfg: {
            name: "GeeksforGeeks",
            color: "gfg-card",
            logo: "https://media.geeksforgeeks.org/wp-content/uploads/20210915115837/gfg3-300x300.png",
            placeholder: "https://placehold.co/40x40/48BB78/FFFFFF?text=GFG",
            stats: [
                { label: "Coding Score", key: "codingScore", default: "N/A" },
                { label: "Institute Rank", key: "instituteRank", default: "N/A" },
                { label: "Problems Solved", key: "totalProblemsSolved", default: "N/A" },
                { label: "Current Streak", key: "currentStreak", default: "N/A", suffix: " days" },
                { label: "Easy Problems", key: "easyProblems", default: 0 },
                { label: "Medium Problems", key: "mediumProblems", default: 0 },
                { label: "Hard Problems", key: 0 }
            ]
        },
        codechef: {
            name: "CodeChef",
            color: "codechef-card",
            logo: "https://cdn.codechef.com/sites/all/themes/abessive/cc-logo.png",
            placeholder: "https://placehold.co/40x40/ED8936/FFFFFF?text=CC",
            stats: [
                { label: "Contest Rating", key: "contest_rating", default: "N/A" },
                { label: "Stars", key: "stars", default: "N/A" },
                { label: "Problems Solved", key: "problems_solved", default: "N/A" },
                { label: "contests_participated", key: "contests_participated", default: "N/A" }
            ]
        },
        hackerrank: {
            name: "HackerRank",
            color: "hackerrank-card",
            logo: "https://upload.wikimedia.org/wikipedia/commons/6/65/HackerRank_logo.png",
            placeholder: "https://placehold.co/40x40/818CF8/FFFFFF?text=HR",
            stats: [
                { label: "Badges", key: "badges", default: 0 },
                { label: "Stars", key: "stars", default: "N/A" }
            ]
        }
    };
        
    // Cache DOM elements
    const resultsDiv = document.getElementById("results");
    const urlParams = new URLSearchParams(window.location.search);
        
    // Main function to display stats
    async function displayStats() {
        console.log("displayStats called.");
        showLoadingState();
        
        try {
            const [platformsData, gfgData] = await Promise.all([
                fetchPlatformsData(currentAuthToken), // Pass token
                fetchGFGData(currentAuthToken) // Pass token
            ]);
            
            renderResults(platformsData, gfgData);
        } catch (error) {
            showErrorState(error);
        }
    }
        
    // Fetch data from platforms API (now sends Authorization header)
    async function fetchPlatformsData(token) {
        console.log("fetchPlatformsData called with token:", token);
        const leetcode = urlParams.get('leetcode');
        const codechef = urlParams.get('codechef');
        const hackerrank = urlParams.get('hackerrank');
        
        if (!leetcode && !codechef && !hackerrank) return {};
        
        try {
            const response = await fetch(
                `https://8teu07es5h.execute-api.us-east-1.amazonaws.com/prob/get-score?` +
                `leetcode=${leetcode || ''}&codechef=${codechef || ''}&hackerrank=${hackerrank || ''}`,
                {
                    headers: {
                        'Authorization': token // Send the ID token here
                    }
                }
            );
            
            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const data = await response.json();
            console.log("Platforms data fetched:", data);
            return data;
        } catch (error) {
            console.error("Error fetching platforms data:", error);
            return {};
        }
    }
        
    // Fetch GFG data (now sends Authorization header)
    async function fetchGFGData(token) {
        console.log("fetchGFGData called with token:", token);
        const gfg = urlParams.get('gfg');
        if (!gfg) return {};
        
        try {
            const response = await fetch(
                `https://1irslt4qe5.execute-api.us-east-1.amazonaws.com/prob/get-score?username=${gfg}`,
                {
                    headers: {
                        'Authorization': token // Send the ID token here
                    }
                }
            );
            
            if (!response.ok) throw new Error(`GFG API request failed with status ${response.status}`);
            
            const data = await response.json();
            console.log("GFG data fetched:", data);
            return typeof data.body === 'string' ? JSON.parse(data.body) : data;
        } catch (error) {
            console.error("Error fetching GFG data:", error);
            return {};
        }
    }
        
    // Show loading state
    function showLoadingState() {
        console.log("Showing loading state.");
        resultsDiv.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16">
                <div class="spinner"></div>
                <p class="mt-6 text-slate-400 text-lg animate-pulse">Fetching your coding stats...</p>
            </div>
        `;
    }
        
    // Show error state
    function showErrorState(error) {
        console.log("Showing error state:", error);
        resultsDiv.innerHTML = `
            <div class="error-card p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 class="text-2xl font-bold mt-4 text-red-300">Failed to Load Data</h3>
                <p class="mt-3 text-slate-300 text-base">${error.message || "Please check your usernames and try again."}</p>
                <button onclick="checkAuthAndDisplayUser()" class="mt-6 back-button bg-red-500/10 hover:bg-red-500/20 text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.172a3 3 0 00.879 2.121l3.121 3.121a1 1 0 010 1.414l-3.121 3.121A3 3 0 005 16.828V19a1 1 0 11-2 0v-2.172a3 3 0 00-.879-2.121L.939 11.293a1 1 0 010-1.414l3.121-3.121A3 3 0 005 3.172V1a1 1 0 011-1zm6 0a1 1 0 011 1v2.172a3 3 0 00.879 2.121l3.121 3.121a1 1 0 010 1.414l-3.121 3.121A3 3 0 0015 16.828V19a1 1 0 11-2 0v-2.172a3 3 0 00-.879-2.121L10.939 11.293a1 1 0 010-1.414l3.121-3.121A3 3 0 0015 3.172V1a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                    Retry
                </button>
            </div>
        `;
    }
        
    // Render results cards
    function renderResults(platformsData, gfgData) {
        console.log("Rendering results with platformsData:", platformsData, "and gfgData:", gfgData);
        resultsDiv.innerHTML = '';
        
        // Get all platform usernames from URL
        const usernames = {
            leetcode: urlParams.get('leetcode'),
            gfg: urlParams.get('gfg'),
            codechef: urlParams.get('codechef'),
            hackerrank: urlParams.get('hackerrank')
        };
        
        let cardCount = 0;
        // Create cards for each platform with data
        Object.entries(usernames).forEach(([platform, username]) => {
            if (!username) return;
            
            const config = platformConfig[platform];
            const data = platform === 'gfg' ? gfgData : platformsData[platform];
            
            if (!data || Object.keys(data).length === 0) { // Check if data is empty object
                renderErrorCard(platform, username, config);
                return;
            }
            
            const card = document.createElement('div');
            card.className = `result-card ${config.color}`;
            card.style.animationDelay = `${cardCount * 0.1}s`;
            
            let statsHTML = '';
            config.stats.forEach(stat => {
                const value = data[stat.key] !== undefined ? data[stat.key] : stat.default;
                statsHTML += `
                    <div class="stat-item">
                        <span class="stat-label">${stat.label}</span>
                        <span class="stat-value">${value}${stat.suffix || ''}</span>
                    </div>
                `;
            });
            
            card.innerHTML = `
                <div class="flex items-center mb-5">
                    <img src="${config.logo}" 
                         onerror="this.onerror=null;this.src='${config.placeholder}'"
                         class="platform-icon" 
                         alt="${config.name} Logo">
                    <h2 class="text-2xl font-bold">${config.name}</h2>
                    <span class="ml-auto bg-slate-800/50 px-3 py-1 rounded-full text-sm font-mono text-slate-300">@${username}</span>
                </div>
                <div class="stats-container flex-grow">
                    ${statsHTML}
                </div>
            `;
            
            resultsDiv.appendChild(card);
            cardCount++;
        });
        
        // Show message if no cards were added
        if (resultsDiv.children.length === 0) {
            resultsDiv.innerHTML = `
                <div class="col-span-full text-center py-16 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="mt-4 text-xl">No usernames provided.</p>
                    <p class="mt-2 text-base">Please go back and enter at least one username to see your stats.</p>
                </div>
            `;
        }
    }
        
    // Render error card for a platform
    function renderErrorCard(platform, username, config) {
        console.log("Rendering error card for:", platform, username);
        const card = document.createElement('div');
        card.className = `result-card ${config.color} border-l-red-500`;
        
        card.innerHTML = `
            <div class="flex items-center mb-5">
                <img src="${config.logo}" 
                     onerror="this.onerror=null;this.src='${config.placeholder}'"
                     class="platform-icon" 
                     alt="${config.name} Logo">
                <h2 class="text-2xl font-bold">${config.name}</h2>
                <span class="ml-auto bg-slate-800/50 px-3 py-1 rounded-full text-sm font-mono text-slate-300">@${username}</span>
            </div>
            <div class="text-red-400 flex items-center text-lg font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Could not retrieve data for this username.
            </div>
        `;
        
        resultsDiv.appendChild(card);
    }
    
    // Make functions globally accessible for onclick attributes (if any on results.html)
    window.displayStats = displayStats; // Added for retry button functionality
}
