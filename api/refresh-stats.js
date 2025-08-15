// /api/refresh-stats.js

import admin from 'firebase-admin';
import axios from 'axios';
import cheerio from 'cheerio';

// --- Firebase Admin Initialization ---
// (This is the same setup as your leaderboard.js)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

/**
 * This is the main handler for the secure /api/refresh-stats endpoint.
 */
export default async function handler(request, response) {
  // 1. --- Security Check: Verify the User's Identity ---
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { authorization } = request.headers;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorized: Missing token.' });
  }

  const idToken = authorization.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Error verifying token:', error);
    return response.status(403).json({ error: 'Unauthorized: Invalid token.' });
  }

  const { uid } = decodedToken; // The user's unique ID

  try {
    // 2. --- Fetch User's Profile from Firestore ---
    const userDocRef = db.collection('users').doc(uid);
    const docSnap = await userDocRef.get();
    if (!docSnap.exists()) {
      return response.status(404).json({ error: 'User profile not found.' });
    }
    const userData = docSnap.data();

    // 3. --- Scrape All Platforms Concurrently ---
    const scrapePromises = [];
    if (userData.leetcode_username) scrapePromises.push(getLeetCodeStats(userData.leetcode_username));
    if (userData.codechef_username) scrapePromises.push(getCodeChefStats(userData.codechef_username));
    if (userData.hackerrank_username) scrapePromises.push(getHackerRankStats(userData.hackerrank_username));
    if (userData.gfg_username) scrapePromises.push(getGfgStats(userData.gfg_username));
    
    // Use Promise.allSettled to ensure that even if one scraping fails, others continue
    const results = await Promise.allSettled(scrapePromises);
    
    // 4. --- Combine Scraped Data ---
    const newStats = {};
    results.forEach(result => {
      // Only include fulfilled promises (successful scrapes)
      if (result.status === 'fulfilled' && result.value) {
        Object.assign(newStats, result.value);
      } else if (result.status === 'rejected') {
        // Log rejected promises to help debug which scrape failed
        console.error('Scraping promise rejected:', result.reason);
      }
    });

    // 5. --- Save the New Stats to Firestore ---
    await userDocRef.update({
      stats: newStats,
      statsLastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() // Track when it was updated
    });

    return response.status(200).json({ success: true, message: 'Stats updated successfully.' });

  } catch (error) {
    console.error('Error in refresh-stats handler:', error);
    return response.status(500).json({ error: 'An internal error occurred while refreshing stats.' });
  }
}


// --- All the scraping functions from get-score.js are copied here ---
// --- Each function is now wrapped in a try-catch block for robustness ---

async function getLeetCodeStats(username) {
  try {
    const { data } = await axios.post('https://leetcode.com/graphql', {
      query: `query u($u:String!){matchedUser(username:$u){submitStats:submitStatsGlobal{acSubmissionNum{d:difficulty,c:count}}}}`,
      variables: { u: username }
    });
    if (data.errors) {
      console.error(`LeetCode GraphQL error for user ${username}:`, data.errors);
      return null;
    }
    const stats = data.data.matchedUser.submitStats.acSubmissionNum;
    return { leetcode: {
        problems_solved: stats.find(s => s.d === 'All')?.c || 0,
        Easy: stats.find(s => s.d === 'Easy')?.c || 0,
        Medium: stats.find(s => s.d === 'Medium')?.c || 0,
        Hard: stats.find(s => s.d === 'Hard')?.c || 0,
    }};
  } catch (error) {
    console.error(`Error scraping LeetCode for user ${username}:`, error.message);
    return null; // Return null on error to prevent crashing
  }
}

async function getCodeChefStats(username) {
  try {
    const { data } = await axios.get(`https://www.codechef.com/users/${username}`);
    const $ = cheerio.load(data);
    const rating = $('.rating-number').text().trim() || '0';
    const stars = $('span.rating').text().trim() || 'Unrated';
    const problems_solved = ($('h3:contains("Total Problems Solved")').text().match(/\d+/) || ['0']);
    const contests_participated = $('.contest-participated-count b').text() || '0';
    return { codechef: {
        problems_solved: parseInt(problems_solved[0]),
        contest_rating: parseInt(rating),
        stars,
        contests_participated: parseInt(contests_participated),
    }};
  } catch (error) {
    console.error(`Error scraping CodeChef for user ${username}:`, error.message);
    return null; // Return null on error to prevent crashing
  }
}

async function getHackerRankStats(username) {
  try {
    const { data } = await axios.get(`https://www.hackerrank.com/profile/${username}`);
    const $ = cheerio.load(data);
    const badgeCount = $('div.hacker-badge').length;
    return { hackerrank: { badges: badgeCount || 0 } };
  } catch (error) {
    console.error(`Error scraping HackerRank for user ${username}:`, error.message);
    return null; // Return null on error to prevent crashing
  }
}

async function getGfgStats(username) {
  try {
    const { data } = await axios.get(`https://auth.geeksforgeeks.org/user/${username}`);
    const $ = cheerio.load(data);
    const totalProblemsSolved = parseInt($('.score_card_name:contains("Overall Problem Solved")').next('.score_card_value').text(), 10) || 0;
    const scriptContent = $('script').filter((i, el) => $(el).html().includes('profile_user_stats')).html();
    const match = scriptContent ? scriptContent.match(/let user_profile_data = (.*?);/) : null;
    let easy = 0, medium = 0, hard = 0;
    if (match && match[1]) {
      try {
        const profileData = JSON.parse(match[1]);
        easy = profileData.submission_counts.easy || 0;
        medium = profileData.submission_counts.medium || 0;
        hard = profileData.submission_counts.hard || 0;
      } catch (e) {
        console.error("Could not parse GFG JSON data from script tag:", e);
        // Fallback to 0 if parsing fails, but don't rethrow
      }
    }
    return { gfg: {
        username: username,
        totalProblemsSolved,
        easyProblems: easy,
        mediumProblems: medium,
        hardProblems: hard,
    }};
  } catch (error) {
    console.error(`Error scraping GFG for user ${username}:`, error.message);
    return null; // Return null on error to prevent crashing
  }
}
