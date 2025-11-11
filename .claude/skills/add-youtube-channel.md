---
description: Add a YouTube channel to the channels.js file by searching for the channel name and retrieving its ID
skill: add-youtube-channel
---

# Add YouTube Channel Skill

This skill helps you add a YouTube channel to the `channels.js` file. It searches for a YouTube channel by name, retrieves the channel ID, and adds it to the appropriate category in `channels.js`.

## How It Works

1. **Search for Channel**: Uses the YouTube Data API v3 to search for channels by name
2. **Retrieve Channel ID**: Extracts the 24-character YouTube channel ID from search results
3. **Validate Format**: Ensures the channel ID is properly formatted (24 characters)
4. **Update channels.js**: Adds the channel ID to the specified category's `youtubeChannels` field
5. **Validate Changes**: Runs the validation script to ensure the update is correct

## Prerequisites

You must have a `YOUTUBE_API_KEY` environment variable set. If not set, ask the user to provide it.

## Available Channel Categories

The following categories are available in `channels.js`:

- `hustle` - Entrepreneurship and business channels
- `ai` - Artificial Intelligence and machine learning channels
- `crypto` - Cryptocurrency and blockchain channels

Note: Some channels like `reddit`, `curious`, and `docus` use Reddit subreddits instead of YouTube channels.

## Workflow

When the user asks to add a YouTube channel, follow these steps:

### Step 1: Check for API Key

Check if the `YOUTUBE_API_KEY` environment variable is set:

```bash
echo $YOUTUBE_API_KEY
```

If not set, ask the user to provide their YouTube API key and instruct them to set it:

```bash
export YOUTUBE_API_KEY="your-api-key-here"
```

### Step 2: Gather Information

Ask the user:

1. What is the channel name or search term? (e.g., "annacavalli", "Y Combinator")
2. Which category should this channel be added to? (hustle, ai, crypto)

### Step 3: Run the Script

Execute the add-youtube-channel script:

```bash
node scripts/add-youtube-channel.js "<channel-name>" "<category>"
```

Examples:

```bash
# Add a channel to a category
node scripts/add-youtube-channel.js "annacavalli" "ai"

# Just search without adding (useful for previewing results)
node scripts/add-youtube-channel.js "Lex Fridman" --justSearch
```

**--justSearch flag**: Use this optional flag to search for a channel and display results without adding it to `channels.js`. This is useful when you want to:
- Preview search results before committing to add a channel
- Verify you found the correct channel
- Get the channel ID for manual reference

### Step 4: Review Results

The script will:

- Search YouTube for the channel
- Display all matching results with their channel IDs
- Automatically use the first result
- Add the channel ID to the specified category in `channels.js`

### Step 5: Validate Changes

Run the validation script to ensure the channel ID is properly formatted:

```bash
npm run prebuild
```

This runs `scripts/check-channels.js` which validates that all YouTube channel IDs are exactly 24 characters long.

### Step 6: Verify in channels.js

Read the `channels.js` file to show the user that the channel was added successfully:

```bash
# Show the updated channel entry
```

Use the Read tool to display the relevant section of `channels.js` to the user.

## Error Handling

### Common Errors

1. **API Key Missing**
   - Error: "YOUTUBE_API_KEY environment variable is not set"
   - Solution: Ask user to set their YouTube API key

2. **Channel Not Found**
   - Error: "No YouTube channel found for: [name]"
   - Solution: Ask user to try a different search term or provide the exact channel name

3. **Invalid Category**
   - Error: "Channel '[category]' not found in channels.js"
   - Solution: Show the user available categories and ask them to choose one

4. **Channel Already Exists**
   - Error: "Channel ID [id] already exists in '[category]'"
   - Solution: Inform the user that the channel is already added

5. **Validation Failed**
   - Error: "channels.js has error(s)"
   - Solution: Check that the channel ID is exactly 24 characters and properly formatted

## YouTube Channel ID Format

YouTube channel IDs:

- Are exactly 24 characters long
- Start with "UC" (User Channel)
- Contain alphanumeric characters and some special characters
- Example: `UCbfYPyITQ-7l4upoX8nvctg`

## API Reference

### YouTube Search API

```

GET https://www.googleapis.com/youtube/v3/search
Parameters:
  - part: id,snippet
  - q: <channel-name>
  - type: channel
  - key: <YOUTUBE_API_KEY>
```

Example response:

```json
{
  "items": [
    {
      "id": {
        "channelId": "UCbfYPyITQ-7l4upoX8nvctg"
      },
      "snippet": {
        "title": "Channel Title",
        "description": "Channel description..."
      }
    }
  ]
}
```

## Example Usage

**User**: "Add the Lex Fridman channel to the AI category"

**Claude**:

1. Checks for YOUTUBE_API_KEY
2. Runs: `node scripts/add-youtube-channel.js "Lex Fridman" "ai"`
3. Shows search results (Lex Fridman Podcast - UCbfYPyITQ-7l4upoX8nvctg)
4. Confirms the channel ID was added
5. Runs: `npm run prebuild` to validate
6. Shows the updated `channels.js` entry

## Best Practices

1. **Always validate** after adding a channel by running `npm run prebuild`
2. **Show the user** what was added by reading the relevant section of `channels.js`
3. **Handle multiple results** by showing all matches and explaining which one was selected
4. **Verify the category** exists before attempting to add the channel
5. **Check for duplicates** before adding (the script does this automatically)

## Notes

- The script automatically selects the first search result
- Channel IDs are appended with semicolon separators (`;`)
- The validation script (`check-channels.js`) ensures all IDs are properly formatted
- If a category doesn't have `youtubeChannels` field yet, create one with the new ID
