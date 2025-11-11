# walnut.tv [![Netlify Status](https://api.netlify.com/api/v1/badges/1fa27190-a5c1-4017-b984-052a0ca3b04e/deploy-status)](https://app.netlify.com/sites/walnut/deploys) [![Depfu](https://badges.depfu.com/badges/f36f8f88cedc8a59f152898cbdaf3ccf/overview.svg)](https://depfu.com/github/gianpaj/walnut.tv?project_id=24383)

[![walnut.tv](https://raw.githubusercontent.com/gianpaj/walnut.tv/master/public/walnut.tv-og-image.png)](https://walnut.tv)

[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://vshymanskyy.github.io/StandWithUkraine)

<a href="https://www.producthunt.com/posts/walnut-2?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-walnut-2" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=151473&theme=dark" alt="Walnut - The hottest videos from Reddit in the last 24 hours 📺🔥 | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

Your dose of daily videos on AI, Crypto, Entrepreneurship, Reddit, Documentaries

## Getting Started

Install browser-sync to start the development server

```bash
npm install browser-sync -g
```

### Run development server

```bash
browser-sync start --server --files="*.html, js/*.js, css/*.css"
```

### Prerequisites

- Node.JS
- YouTube API key to search videos there

## Deployment

Automatically on Netlify. Soon on Vercel

## Built With

- [Vue.JS](http://vuejs.org/) v1.0 - we should upgrade to Vue.JS 3 or migrate to Next.js static build or even Astro
- [vue-select](https://github.com/sagalbot/vue-select) v1.3
- [reddit.js](https://github.com/sahilm/reddit.js)
- [youtube-api-v3-search](https://github.com/LionRoar/youtube-api-v3-search)
- jQuery v1.12
