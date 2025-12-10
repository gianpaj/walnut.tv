#!/usr/bin/env node

/**
 * Script to extract YouTube channel ID from either a video link or username
 *
 * Usage:
 *   node scripts/extract-youtube-channel-id.js <input>
 *
 * Arguments:
 *   input - Either a YouTube video URL or a channel username/handle
 *
 * Examples:
 *   node scripts/extract-youtube-channel-id.js "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   node scripts/extract-youtube-channel-id.js "https://youtu.be/dQw4w9WgXcQ"
 *   node scripts/extract-youtube-channel-id.js "lexfridman"
 *   node scripts/extract-youtube-channel-id.js "@lexfridman"
 *   node scripts/extract-youtube-channel-id.js "UC2D6eRvCeMtcF5OGHf1-trw"
 *
 * Environment Variables:
 *   YOUTUBE_API_KEY - Required YouTube Data API v3 key
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Check if input is already a YouTube channel ID (24 characters, alphanumeric)
 */
function isChannelId(input) {
  return /^UC[a-zA-Z0-9_-]{22}$/.test(input) && input.length === 24;
}

/**
 * Check if input looks like a YouTube URL
 */
function isVideoUrl(input) {
  return /(?:youtube\.com|youtu\.be)/.test(input);
}

/**
 * Get channel information from video ID
 */
async function getChannelFromVideo(videoId) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`YouTube API Error: ${data.error.message}`);
    }

    if (!data.items || data.items.length === 0) {
      throw new Error(`No video found with ID: ${videoId}`);
    }

    const video = data.items[0];
    return {
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      videoTitle: video.snippet.title
    };
  } catch (error) {
    if (error.message.includes('YouTube API')) {
      throw error;
    }
    throw new Error(`Failed to fetch video data: ${error.message}`);
  }
}

/**
 * Search for channel by username/handle
 */
async function searchChannelByName(username) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  // Remove @ symbol if present
  const cleanUsername = username.replace(/^@/, '');

  const url = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(cleanUsername)}&type=channel&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube API HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`YouTube API Error: ${data.error.message}`);
    }

    if (!data.items || data.items.length === 0) {
      throw new Error(`No channel found for username: ${username}`);
    }

    return data.items.map(item => ({
      channelId: item.id.channelId,
      channelTitle: item.snippet.title,
      description: item.snippet.description
    }));
  } catch (error) {
    if (error.message.includes('YouTube API')) {
      throw error;
    }
    throw new Error(`Failed to search for channel: ${error.message}`);
  }
}

/**
 * Get channel information by channel ID (for validation)
 */
async function getChannelById(channelId) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube API HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`YouTube API Error: ${data.error.message}`);
    }

    if (!data.items || data.items.length === 0) {
      throw new Error(`No channel found with ID: ${channelId}`);
    }

    const channel = data.items[0];
    return {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      description: channel.snippet.description
    };
  } catch (error) {
    if (error.message.includes('YouTube API')) {
      throw error;
    }
    throw new Error(`Failed to fetch channel data: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('Usage: node scripts/extract-youtube-channel-id.js <input>', 'yellow');
    log('', 'reset');
    log('Where <input> can be:', 'blue');
    log('  - YouTube video URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'blue');
    log('  - YouTube short URL: https://youtu.be/dQw4w9WgXcQ', 'blue');
    log('  - Channel username: lexfridman or @lexfridman', 'blue');
    log('  - Channel ID: UC2D6eRvCeMtcF5OGHf1-trw', 'blue');
    log('', 'reset');
    log('Environment variable required: YOUTUBE_API_KEY', 'yellow');
    process.exit(1);
  }

  const input = args[0].trim();

  try {
    if (isChannelId(input)) {
      // Input is already a channel ID, just validate it
      log(`Input appears to be a channel ID: ${input}`, 'blue');
      const channelInfo = await getChannelById(input);
      
      log('\n✅ Channel found:', 'green');
      log(`   Channel ID: ${channelInfo.channelId}`, 'reset');
      log(`   Channel Title: ${channelInfo.channelTitle}`, 'reset');
      log(`   Description: ${channelInfo.description.substring(0, 100)}...`, 'reset');
      
    } else if (isVideoUrl(input)) {
      // Extract channel ID from video URL
      log(`Extracting channel ID from video URL: ${input}`, 'blue');
      
      const videoId = extractVideoId(input);
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }

      log(`Extracted video ID: ${videoId}`, 'blue');
      
      const videoInfo = await getChannelFromVideo(videoId);
      
      log('\n✅ Channel found:', 'green');
      log(`   Video Title: ${videoInfo.videoTitle}`, 'reset');
      log(`   Channel ID: ${videoInfo.channelId}`, 'reset');
      log(`   Channel Title: ${videoInfo.channelTitle}`, 'reset');
      
    } else {
      // Treat as username/channel name
      log(`Searching for channel by name: ${input}`, 'blue');
      
      const results = await searchChannelByName(input);
      
      if (results.length === 1) {
        const channel = results[0];
        log('\n✅ Channel found:', 'green');
        log(`   Channel ID: ${channel.channelId}`, 'reset');
        log(`   Channel Title: ${channel.channelTitle}`, 'reset');
        log(`   Description: ${channel.description.substring(0, 100)}...`, 'reset');
      } else {
        log(`\n✅ Found ${results.length} channels:`, 'green');
        
        results.forEach((channel, index) => {
          log(`\n${index + 1}. ${channel.channelTitle}`, 'blue');
          log(`   Channel ID: ${channel.channelId}`, 'reset');
          log(`   Description: ${channel.description.substring(0, 100)}...`, 'reset');
        });
        
        log('\nTip: Use the exact channel ID for precise results', 'yellow');
      }
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();