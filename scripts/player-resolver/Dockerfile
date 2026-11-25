FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/yt-dlp \
    && /opt/yt-dlp/bin/pip install --no-cache-dir 'yt-dlp[default]==2026.11.23'

WORKDIR /app
COPY --chown=node:node scripts/player-resolver/server.mjs scripts/player-resolver/
COPY --chown=node:node src/app/lab/player/direct/local-resolver.ts \
    src/app/lab/player/direct/mp4-url.ts \
    src/app/lab/player/direct/resolver.ts \
    src/app/lab/player/direct/videos.ts \
    src/app/lab/player/direct/

ENV PLAYER_LAB_YT_DLP=/opt/yt-dlp/bin/yt-dlp
USER node
CMD ["node", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/player-resolver/server.mjs"]
