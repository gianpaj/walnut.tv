# Agent Note: Native player lab

Status: proposed — the feature branch provides a runnable lab for evaluation.

## Problem

Walnut's YouTube player gives the app limited control over the playback controls
and the images shown around playback. We need to see whether our own player is
better to use before committing to new media delivery or account infrastructure.

## Proposal

Use `/lab/player` to play Blender's _Sintel_ trailer in an HTML video element
next to the official YouTube embed. Both use the same cut. The native player
serves a 480p H.264/AAC MP4 with WebVTT captions and a sprite sampled every three
seconds. The preview reads the sprite instead of seeking the playing video.
The English caption track follows the dialogue and music in Blender's trailer
audio.

The `/lab/player/direct` page tests a separate delivery path with the Sintel
trailer and a TED talk. A Node route invokes yt-dlp for those two IDs and
returns a fresh HTTPS `googlevideo.com` MP4 URL in JSON. It uses yt-dlp's web
embed client because both clips allow embedding and its URLs passed the
byte-range checks. The browser's video element requests the MP4 and handles
seeking. The route requires `PLAYER_LAB_YT_DLP` on the Next.js host.

The direct lab also runs that same resolver in a Docker container on the
viewing device. Chrome calls the loopback endpoint after the viewer selects local
mode. The helper accepts the configured Walnut origin and the lab's two video
IDs. The container runs as an unprivileged user with a read-only root filesystem
and no host mounts. URL resolution and playback use the viewer's internet connection.

Save only the main clip's timestamp in browser storage. A finished clip clears
its resume point. The intro and outro are stills in the player area and have no
playback time of their own. The first playback event reads duration from the
element because metadata can arrive before React hydrates.

## Alternatives considered

- Put the new controls around the YouTube iframe. That keeps YouTube as the
  source but cannot test direct seeking and control over the video area.
- Start with adaptive streaming and account sync. A single MP4 and local resume
  let us test the controls before choosing streaming or account infrastructure.
- Relay video through the Walnut server. Returning only the URL tests whether
  YouTube accepts media requests from the browser and keeps media traffic off
  the Walnut server.
- Run the resolver in a browser worker or a browser-hosted VM. Both use the
  browser's networking APIs and inherit its cross-origin fetch restrictions.
  Docker gives the resolver its own process and outbound network access.
- Run the local resolver in a guest OS. A Docker container gives the resolver
  process and filesystem isolation with the same loopback interface and a
  smaller setup.

## Acceptance criteria

The production build passed browser checks for playback, touch and keyboard
seeking, caption cues, resume after reload, completion, and replay in Chrome
desktop, Chrome with a touch viewport, and WebKit with an emulated iPhone.
Desktop Chromium can exit fullscreen from the outro. Chrome recovered from a
blocked media request and preserved the resume timestamp. The MP4 served byte
ranges. Both players presented frames after a user gesture and responded to
seeking on desktop Chrome and emulated iPhone WebKit. Both entered document
fullscreen on desktop Chrome.

`pnpm test` checks the late trailer cues. The
[caption browser checks](../../../../scripts/browser-acceptance/README.md#player-lab-captions)
verify visible text at 0:39 and the CC toggle while paused. Their live run also
checks caption text in the official embeds for Sintel and TED's
The Power of Vulnerability.

With yt-dlp 2026.11.23 and the web embed client, Chrome played both YouTube MP4s
with audio and sought to 0:39 in Sintel and 1:00 in the TED talk. The test saw
Chrome request the media directly from `googlevideo.com`. Both also passed
when Chrome opened the lab over HTTPS through Tailscale on the resolver host.

The Docker resolver passed the same playback checks on loopback and from the
Tailscale HTTPS page with Chrome's **Apps on device** permission. Chrome fetched
the URL only from the loopback helper and requested the media from YouTube.
The helper rejected requests with a missing or foreign origin, a foreign host,
an unsupported method, or a video outside the lab list.

## Risks

WebKit emulation does not cover the physical iPhone player. The fullscreen
fallback hands the video over to the system player, so custom controls and the
outro need a device check. Startup timings on a local MP4 and a remote YouTube
embed compare those delivery paths and cannot isolate player overhead.
Both direct modes depend on undocumented YouTube responses. Initial tests
with yt-dlp's default client selection saw intermittent HTTP 403 from the
media server after successful URL discovery. The checks run on one network.
Local mode requires Docker on each viewing device and Chrome's loopback
permission from a remote HTTPS page. The direct MP4 experiment covers one
quality per clip.

[Blender source](https://download.blender.org/durian/trailer/) ·
[Blender attribution requirements](https://durian.blender.org/sharing/) ·
[WebKit fullscreen issue](https://bugs.webkit.org/show_bug.cgi?id=fullscreen-ios)
