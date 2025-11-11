# CLAUDE.md

This file contains information about the walnut.tv project to help Claude Code understand the codebase better.

## Project Overview

**walnut.tv** is a web application that curates and displays the hottest videos from Reddit in the last 24 hours. It provides daily video content focused on topics like AI, Crypto, Entrepreneurship, Reddit content, and Documentaries.

- **Live Site**: https://walnut.tv
- **Repository**: https://github.com/gianpaj/walnut.tv

## Tech Stack

### Current Stack

- **Vue.js v1.0** - Frontend framework (legacy version)
- **vue-select v1.3** - Select component
- **reddit.js** - Reddit API integration
- **youtube-api-v3-search** - YouTube API integration
- **jQuery v1.12** - DOM manipulation (legacy)
- **browser-sync** - Development server

### Future Considerations

The README notes that the project should consider upgrading to:

- Vue.js 3
- Next.js static build
- Astro

## Project Structure

### Key Files

- `index.html` - Main entry point
- `js/*.js` - JavaScript source files
- `css/*.css` - Stylesheets
- `channels.js` - Channel configuration (YouTube channel IDs and Reddit subreddits)
- `scripts/check-channels.js` - Channel validation script (validates YouTube channel ID format)
- `scripts/add-youtube-channel.js` - Script to add YouTube channels via API search

## Development

### Prerequisites

- Node.js
- YouTube API key (for searching videos)

### Setup & Running

```bash
npm install browser-sync -g
npm start
# or
browser-sync start --server --files="*.html, js/*.js, css/*.css"
```

### Available Scripts

- `npm start` - Start development server with browser-sync
- `npm run prebuild` - Run channel checks
- `npm run build` - Build process (currently just echoes "works")
- `npm run watch-prebuild` - Watch mode for channel validation
- `node scripts/add-youtube-channel.js <channel-name> <category>` - Add a YouTube channel to channels.js

## Deployment

- **Primary**: Netlify (automatic deployments)
- **Future**: Vercel (planned)

## Dependencies

### Dev Dependencies

- browser-sync 3
- eslint 9
- nodemon 3
- stylelint 16
- stylelint-config-standard 39
- yup 1.7.0

### Runtime Dependencies

- @types/gapi ^0.0.47

## Code Quality

The project uses:

- ESLint for JavaScript linting
- Stylelint for CSS linting

## Known Technical Debt

1. **Vue.js v1.0** - Very outdated version, should be upgraded
2. **jQuery v1.12** - Legacy dependency, could be removed with modern Vue
3. **No test suite** - Tests are not implemented
4. **Build process** - Currently minimal/placeholder

## Working with This Codebase

### When Making Changes

- Test locally with browser-sync hot reload
- Run `npm run prebuild` to validate channels before building
- Follow ESLint and Stylelint rules
- Consider the eventual migration path to Vue 3/Next.js/Astro when adding features

### API Integration

- YouTube API requires an API key (not in repo)
- Reddit integration through reddit.js library
- Video content is refreshed based on 24-hour cycles

### Adding YouTube Channels

The project has a custom workflow for adding YouTube channels to `channels.js`. Use the `add-youtube-channel` skill:

```bash
# Set your YouTube API key first
export YOUTUBE_API_KEY="your-api-key-here"

# Add a channel
node scripts/add-youtube-channel.js "channel-name" "category"

# Example
node scripts/add-youtube-channel.js "Lex Fridman" "ai"
```

**Available categories**: `hustle`, `ai`, `crypto`

The script will:
1. Search YouTube for the channel name
2. Display matching results
3. Extract the 24-character YouTube channel ID
4. Add it to the specified category in `channels.js`
5. Validate the format

**Always run validation after adding a channel:**

```bash
npm run prebuild
```

#### YouTube Channel ID Format

- Must be exactly 24 characters
- Format: alphanumeric string (usually starts with "UC")
- Example: `UCbfYPyITQ-7l4upoX8nvctg`

#### YouTube Search API

The script uses YouTube Data API v3:

```
GET https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&q=<channel-name>&type=channel&key=<API_KEY>
```

## Author

Gianfranco Palumbo and Alexander Kostinskyi.

## License

MIT
