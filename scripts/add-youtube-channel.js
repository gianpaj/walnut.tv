#!/usr/bin/env node

/**
 * Script to add a YouTube channel to channels.js
 * Usage: node scripts/add-youtube-channel.js <channelName> <channelTitle>
 * Example: node scripts/add-youtube-channel.js "annacavalli" "ai"
 */

const fs = require('fs');
const path = require('path');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNELS_FILE_PATH = path.join(__dirname, '../channels.js');

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

async function searchYouTubeChannel(channelName) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY environment variable is not set');
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&q=${encodeURIComponent(
    channelName
  )}&type=channel&key=${YOUTUBE_API_KEY}`;

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
      throw new Error(`No YouTube channel found for: ${channelName}`);
    }

    return data.items;
  } catch (error) {
    if (error.message.includes('YouTube API')) {
      throw error;
    }
    throw new Error(`Failed to fetch from YouTube API: ${error.message}`);
  }
}

function addChannelToFile(channelTitle, channelId) {
  try {
    let content = fs.readFileSync(CHANNELS_FILE_PATH, 'utf8');

    // Find the channel object with the matching title
    const channelRegex = new RegExp(
      `(\\{[^}]*title:\\s*['"]${channelTitle}['"][^}]*)(youtubeChannels:\\s*['"]([^'"]*)['"]),`,
      'gs'
    );

    const match = channelRegex.exec(content);

    if (!match) {
      log(`Channel "${channelTitle}" not found in channels.js`, 'red');
      log('Available channels:', 'yellow');

      // Extract and display available channel titles
      const titleMatches = content.matchAll(/title:\s*['"]([^'"]+)['"]/g);
      for (const titleMatch of titleMatches) {
        log(`  - ${titleMatch[1]}`, 'blue');
      }

      return false;
    }

    const existingIds = match[3];

    // Check if the channel ID already exists
    if (existingIds.includes(channelId)) {
      log(`Channel ID ${channelId} already exists in "${channelTitle}"`, 'yellow');
      return false;
    }

    // Add the new channel ID
    const newIds = existingIds ? `${existingIds};${channelId}` : channelId;
    const replacement = `${match[1]}youtubeChannels: '${newIds}',`;

    content = content.replace(match[0], replacement);

    fs.writeFileSync(CHANNELS_FILE_PATH, content, 'utf8');

    log(`Successfully added channel ID ${channelId} to "${channelTitle}"`, 'green');
    return true;
  } catch (error) {
    log(`Failed to update channels.js: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    log('Usage: node scripts/add-youtube-channel.js <channelName> <channelTitle>', 'yellow');
    log('Example: node scripts/add-youtube-channel.js "annacavalli" "ai"', 'blue');
    process.exit(1);
  }

  const [channelName, channelTitle] = args;

  log(`Searching for YouTube channel: ${channelName}`, 'blue');

  try {
    const results = await searchYouTubeChannel(channelName);

    log(`\nFound ${results.length} result(s):`, 'green');

    results.forEach((item, index) => {
      log(`\n${index + 1}. ${item.snippet.title}`, 'blue');
      log(`   Channel ID: ${item.id.channelId}`, 'reset');
      log(`   Description: ${item.snippet.description.substring(0, 100)}...`, 'reset');
    });

    // Use the first result
    const selectedChannel = results[0];
    const channelId = selectedChannel.id.channelId;

    log(`\nUsing: ${selectedChannel.snippet.title} (${channelId})`, 'green');

    // Validate channel ID format (YouTube channel IDs are 24 characters)
    if (channelId.length !== 24) {
      log(`Warning: Channel ID has unusual length (${channelId.length} chars)`, 'yellow');
    }

    // Add to channels.js
    const success = addChannelToFile(channelTitle, channelId);

    if (success) {
      log('\nNext steps:', 'green');
      log('1. Run: npm run prebuild', 'blue');
      log('2. Review the changes in channels.js', 'blue');
      log('3. Test your changes locally', 'blue');
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
