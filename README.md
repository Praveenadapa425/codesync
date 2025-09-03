# CodeSync - The Competitive Programmer's Dashboard

CodeSync is a modern web application designed for competitive programmers to consolidate, track, and visualize their progress across multiple coding platforms. It securely aggregates user statistics from LeetCode, CodeChef, GeeksforGeeks, and HackerRank into a single, personalized dashboard.

**[View the Live Demo](https://codesync-praveen.vercel.app/)** 

<!--- ### TODO: Add a screenshot of your project here -->

---

## ✨ Key Features

*   **Secure User Authentication:** Users can sign up, log in, and reset their passwords. New accounts require email verification, ensuring that all users are legitimate and preventing unauthorized access.

*   **Personalized Dashboard:** After logging in, users are greeted with a dashboard that displays their latest saved statistics from all linked coding platforms, providing an at-a-glance overview of their progress.

*   **Profile Management:** A dedicated page allows users to add or update their usernames for LeetCode, CodeChef, GeeksforGeeks, and HackerRank at any time, ensuring their stats remain up-to-date.

*   **Live Stats Refresh:** A "Refresh Stats" button securely calls the backend to scrape the user's latest data, saves it to the database, and updates the view in real-time. This provides immediate feedback on recent competitive programming activity.

*   **Automated Daily Leaderboard:** A public leaderboard showcases the total problem counts of all users, which is automatically updated every day at midnight (UTC) via a secure cron job. This fosters a competitive and engaging community.

---

## 🚀 Technology Stack

This project leverages a modern, serverless, and decoupled architecture for scalability, security, and maintainability.

| Category      | Technologies                                                                                                                                                                                             |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Frontend**  | ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) |
| **Backend**   | ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) |
| **Database & Auth** | ![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase) ![Google Cloud](https://img.shields.io/badge/Google%20Cloud-%234285F4.svg?style=for-the-badge&logo=google-cloud&logoColor=white) |

*   **Frontend:** Built with plain HTML, styled efficiently with **Tailwind CSS** for a responsive and modern UI, and powered by **Vanilla JavaScript (ESM)** for interactive elements.
*   **Backend:** Implemented using **Node.js** and deployed as **Vercel Serverless Functions**, providing a scalable and cost-effective solution for handling API requests and background tasks.
*   **Database:** **Google Firestore** serves as the primary NoSQL database for storing user data, coding platform statistics, and leaderboard scores.
*   **Authentication:** **Firebase Authentication** handles all user authentication flows, including secure sign-up, login, password management, and crucial email verification.
*   **Hosting:** **Vercel** provides seamless hosting for both the static frontend assets and the serverless backend functions.
*   **Scraping:** **`axios`** is used for making efficient HTTP requests, and **`cheerio`** for parsing HTML to extract competitive programming statistics.

---

## 🏗️ Architecture Overview

The project adheres to a decoupled, client-server architecture with distinct responsibilities:

*   **`CodeSync-Frontend` (Public Repository):** This repository contains all user-facing static files (HTML, CSS, JavaScript). It is solely responsible for rendering the user interface and initiating API calls to the backend. This public exposure is safe as no sensitive logic or credentials reside here.

*   **`CodeSync-Backend` (Private Repository):** This repository houses all secure, server-side business logic. It includes API endpoints for user authentication, data scraping, and the automated daily leaderboard update cron job. Keeping this repository private is crucial for safeguarding sensitive credentials and proprietary scraping logic.

This architectural separation is a core security principle, ensuring that sensitive code is never exposed publicly and allowing for independent development and scaling of frontend and backend components.

---

## 🔐 Security Best Practices

To ensure the highest level of security, the following best practices are implemented:

*   **API Key Management:** Firebase Service Account Keys are stored securely as environment variables on Vercel and never committed to source control.
*   **Input Validation:** Data received from the frontend is validated and sanitized on the backend to prevent injection attacks.
*   **Error Handling & Logging:** Comprehensive error handling is in place on the backend, with errors logged to a secure service without exposing sensitive details.
*   **Least Privilege Principle:** Firebase Service Accounts are configured with the minimum necessary permissions required to perform their functions.
*   **Secure Communication:** All communication between the frontend and backend is encrypted using HTTPS/TLS.
*   **Responsible Scraping:** The backend adheres to ethical practices, including setting appropriate User-Agent headers and implementing polite throttling to avoid overwhelming target platforms.

---

## 🛠️ Local Development Setup

To run this project on your local machine, you will need to set up both the frontend and the backend.

### Prerequisites
*   [Git](https://git-scm.com/)
*   [Node.js](https://nodejs.org/) (which includes `npm`)
*   [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)

### 1. Clone the Repositories
```bash
# Clone the public frontend repository
git clone https://github.com/YourUsername/CodeSync-Frontend.git

# Clone the private backend repository
git clone https://github.com/YourUsername/CodeSync-Backend.git
```
*(Note: Replace `YourUsername` with your actual GitHub username.)*

### 2. Backend Setup
1.  Navigate into the backend directory: `cd CodeSync-Backend`
2.  Install dependencies: `npm install`
3.  Create an environment file named `.env.development.local`.
4.  Add your Firebase Service Account Key JSON to this file:
    ```
    FIREBASE_SERVICE_ACCOUNT_KEY={"type": "service_account", ...}
    ```
5.  Add a secret for testing the cron job:
    ```
    CRON_SECRET=MySecureSecretForTesting123
    ```

### 3. Frontend Setup
1.  Navigate into the frontend directory: `cd CodeSync-Frontend`
2.  In the `js/` folder, create `firebase_config.js` and add your Firebase web app configuration.
    ```javascript
    export const firebaseConfig = { apiKey: "...", ... };
    ```
3.  In the `js/` folder, create `api_config.js` and point it to the local backend.
    ```javascript
    export const API_BASE_URL = "http://localhost:3000";
    ```

### 4. Running Locally
1.  **Start Backend:** In the `CodeSync-Backend` terminal, run:
    ```bash
    vercel dev
    ```
2.  **Start Frontend:** In a separate `CodeSync-Frontend` terminal, run:
    ```bash
    vercel dev
    ```
    The frontend will start on a different port (e.g., `http://localhost:3001`). Open this address in your browser.

---

## 🚀 Deployment
This project is designed for seamless deployment on Vercel. Pushing changes to the `main` branch of each repository will automatically trigger a new deployment.

### Required Environment Variables (on Vercel)
For the **`CodeSync-Backend`** project, you must configure the following in the Vercel project settings:
*   `FIREBASE_SERVICE_ACCOUNT_KEY`: The full JSON of your Firebase service account key.
*   `CRON_SECRET`: The secure secret that protects your daily leaderboard update function.

---

## 📄 License
This project is licensed under the MIT License. You are free to use, modify, and distribute this software for any purpose, provided the original copyright and license notice are included.
