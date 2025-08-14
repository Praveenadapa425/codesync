
// Import the necessary libraries
import axios from 'axios';
import cheerio from 'cheerio';

// This is the main function Vercel will execute when /api/get-score is accessed.
export default async function handler(request, response) {
  // Get 'platform' and 'username' from the URL query parameters
  const { platform, username } = request.query;

  // Basic validation
  if (!platform || !username) {
    return response.status(400).json({ error: 'Platform and username are required parameters.' });
  }

  try {
    let data;
    // Use a switch statement to route to the correct scraping function
    // based on the 'platform' query parameter.
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
        return response.status(400).json({ error: 'Unsupported platform provided.' });
    }
    
    // Set a caching header. This tells Vercel to cache the result for 1 hour (3600 seconds).
    // This prevents re-scraping on every page refresh, making your app faster and more respectful to the platforms.
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    
    // Send the successfully scraped data back to the frontend.
    return response.status(200).json(data);

  } catch (error) {
    console.error(`Scraping Error for ${platform} user ${username}:`, error.message);
    return response.status(500).json({ error: `Failed to fetch stats for ${platform}. User may not exist or the platform's structure has changed.` });
  }
}

// --- Platform-Specific Scraping Functions ---

/**
 * Translates your leetcode.py
 * Fetches LeetCode stats using their official GraphQL API.
 */
async function getLeetCodeStats(username) {
  const { data } = await axios.post('https://leetcode.com/graphql', {
    query: `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          submitStats: submitStatsGlobal {
            acSubmissionNum { difficulty count }
          }
        }
      }
    `,
    variables: { username }
  });

  if (data.errors) throw new Error(data.errors[0].message);
  const stats = data.data.matchedUser.submitStats.acSubmissionNum;
  
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
 * Translates your codechef.py
 * Scrapes the public CodeChef user profile page.
 */
async function getCodeChefStats(username) {
  const url = `https://www.codechef.com/users/${username}`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  const rating = $('.rating-number').text().trim() || '0';
  const stars = $('span.rating').text().trim() || 'Unrated';
  const problems_solved_text = $('h3:contains("Total Problems Solved")').text();
  const problems_solved = problems_solved_text.match(/\d+/) ? problems_solved_text.match(/\d+/)[0] : '0';
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
 * Translates your hacerRank.py
 * Scrapes the public HackerRank user profile page.
 */
async function getHackerRankStats(username) {
    const url = `https://www.hackerrank.com/profile/${username}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // The badge count is the most reliable metric we can scrape easily.
    const badgeCount = $('div.hacker-badge').length;

    return {
        hackerrank: {
            badges: badgeCount || 0
        }
    };
}


/**
 * Translates your gfg.py
 * This function is different from your Python code because running a full browser (Selenium)
 * is not practical or free on Vercel's serverless functions.
 * Instead, we use a more efficient method of finding the data embedded in the page's HTML.
 */
async function getGfgStats(username) {
  const url = `https://auth.geeksforgeeks.org/user/${username}`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  // Scrape basic info directly from elements
  const scoreText = $('.score_card_name:contains("Overall Problem Solved")').next('.score_card_value').text();
  const totalProblemsSolved = parseInt(scoreText, 10) || 0;
  
  // The difficulty breakdown is inside a <script> tag. We need to extract it.
  const scriptContent = $('script').filter((i, el) => {
    return $(el).html().includes('profile_user_stats');
  }).html();

  let easy = 0, medium = 0, hard = 0;
  // Use a regular expression to find the JSON data within the script
  const match = scriptContent ? scriptContent.match(/let user_profile_data = (.*?);/) : null;
  
  if (match && match[1]) {
    try {
      const profileData = JSON.parse(match[1]);
      const submissionStats = profileData.submission_counts;
      easy = submissionStats.easy || 0;
      medium = submissionStats.medium || 0;
      hard = submissionStats.hard || 0;
    } catch (e) {
      console.error("Could not parse GFG JSON data", e);
    }
  }

  // GFG data is not nested in the response format your frontend expects
  return {
      username: username,
      totalProblemsSolved: totalProblemsSolved,
      easyProblems: easy,
      mediumProblems: medium,
      hardProblems: hard,
  };
}