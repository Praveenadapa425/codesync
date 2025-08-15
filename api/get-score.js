// /api/get-score.js

// Import the necessary libraries from your package.json
import axios from 'axios';
import cheerio from 'cheerio';

/**
 * This is the main Vercel Serverless Function.
 * It acts as a router, taking a `platform` and `username` from the URL,
 * calling the correct scraping function, and returning the data to the frontend.
 */
export default async function handler(request, response) {
  // Extract 'platform' and 'username' from the URL query.
  // Example: /api/get-score?platform=leetcode&username=testuser
  const { platform, username } = request.query;

  // Validate that the required parameters were provided.
  if (!platform || !username) {
    return response.status(400).json({ error: 'Platform and username are required query parameters.' });
  }

  try {
    let data;
    // This switch statement calls the appropriate function based on the platform.
    switch (platform.toLowerCase()) {
      case 'leetcode':
        data = await getLeetCodeStats(username);
        break;
      case 'codechef':
        data = await getCodeChefStats(username);
        break;
      case 'hackerrank':
        data = await getHackerRankStats(username);
        break;
      case 'gfg':
        data = await getGfgStats(username);
        break;
      default:
        // If the platform is not one of the above, return an error.
        return response.status(400).json({ error: 'Unsupported platform provided.' });
    }
    
    // IMPORTANT: Set a caching header. This tells Vercel to cache the result for 1 hour (3600 seconds).
    // This dramatically improves performance and prevents you from scraping the same page on every single visit.
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    // If everything was successful, send the scraped data back to the frontend with a 200 OK status.
    return response.status(200).json(data);

  } catch (error) {
    // If any of the scraping functions fail, this block will catch the error.
    console.error(`Scraping Error for ${platform} user ${username}:`, error.message);
    // Return a 500 Internal Server Error, indicating a problem on our end.
    return response.status(500).json({ error: `Failed to fetch stats for ${platform}. The user might not exist or the site's layout may have changed.` });
  }
}

// --- Platform-Specific Scraping Functions ---

/**
 * Fetches LeetCode stats using their official GraphQL API.
 * This is the most reliable method.
 */
async function getLeetCodeStats(username) {
  const { data } = await axios.post('https://leetcode.com/graphql', {
    query: `query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          submitStats: submitStatsGlobal {
            acSubmissionNum { difficulty count }
          }
        }
      }`,
    variables: { username }
  });

  if (data.errors) {
    throw new Error(data.errors[0].message);
  }
  
  const stats = data.data.matchedUser.submitStats.acSubmissionNum;
  
  // This returns the data in a nested object, as expected by results.html
  return {
    leetcode: {
      problems_solved: stats.find(s => s.difficulty === 'All')?.count || 0,
      Easy: stats.find(s => s.difficulty === 'Easy')?.count || 0,
      Medium: stats.find(s => s.difficulty === 'Medium')?.count || 0,
      Hard: stats.find(s => s.difficulty === 'Hard')?.count || 0,
    }
  };
}

/**
 * Scrapes the public CodeChef user profile page.
 */
async function getCodeChefStats(username) {
  const { data } = await axios.get(`https://www.codechef.com/users/${username}`);
  const $ = cheerio.load(data);
  
  const rating = $('.rating-number').text().trim() || '0';
  const stars = $('span.rating').text().trim() || 'Unrated';
  const problemsSolvedText = $('h3:contains("Total Problems Solved")').text();
  const problemsSolvedMatch = problemsSolvedText.match(/\d+/);
  const problems_solved = problemsSolvedMatch ? problemsSolvedMatch[0] : '0';
  const contests_participated = $('.contest-participated-count b').text() || '0';

  return {
    codechef: {
      problems_solved: parseInt(problems_solved, 10),
      contest_rating: parseInt(rating, 10),
      stars: stars,
      contests_participated: parseInt(contests_participated, 10),
    }
  };
}

/**
 * Scrapes the public HackerRank user profile page for the badge count.
 */
async function getHackerRankStats(username) {
    const { data } = await axios.get(`https://www.hackerrank.com/profile/${username}`);
    const $ = cheerio.load(data);
    const badgeCount = $('div.hacker-badge').length;
    
    return {
        hackerrank: {
            badges: badgeCount || 0
        }
    };
}

/**
 * Scrapes the GeeksforGeeks profile by parsing a script tag, which is more
 * reliable than looking for specific HTML elements that might change.
 */
async function getGfgStats(username) {
  const { data } = await axios.get(`https://auth.geeksforgeeks.org/user/${username}`);
  const $ = cheerio.load(data);
  
  const totalProblemsSolved = parseInt($('.score_card_name:contains("Overall Problem Solved")').next('.score_card_value').text(), 10) || 0;
  
  // Find the script tag containing the user's detailed stats
  const scriptContent = $('script').filter((i, el) => $(el).html().includes('profile_user_stats')).html();

  let easy = 0, medium = 0, hard = 0;
  
  // Use a Regular Expression to extract the JSON object from the script text
  const match = scriptContent ? scriptContent.match(/let user_profile_data = (.*?);/) : null;
  
  if (match && match[1]) {
    try {
      const profileData = JSON.parse(match[1]);
      const submissionStats = profileData.submission_counts;
      easy = submissionStats.easy || 0;
      medium = submissionStats.medium || 0;
      hard = submissionStats.hard || 0;
    } catch (e) {
      console.error("Could not parse GFG JSON data from script tag", e);
    }
  }

  // IMPORTANT: This returns a FLAT object, which is exactly what your
  // results.html file expects for the GeeksforGeeks card.
  return {
      username: username,
      totalProblemsSolved: totalProblemsSolved,
      easyProblems: easy,
      mediumProblems: medium,
      hardProblems: hard,
  };
}