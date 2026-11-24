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

Save only the main clip's timestamp in browser storage. A finished clip clears
its resume point. The intro and outro are stills in the player area and have no
playback time of their own. The first playback event reads duration from the
element because metadata can arrive before React hydrates.

## Alternatives considered

- Put the new controls around the YouTube iframe. That keeps YouTube as the
  source but cannot test direct seeking and control over the video area.
- Start with adaptive streaming and account sync. A single MP4 and local resume
  let us test the controls before choosing streaming or account infrastructure.

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

## Risks

WebKit emulation does not cover the physical iPhone player. The fullscreen
fallback hands the video over to the system player, so custom controls and the
outro need a device check. Startup timings on a local MP4 and a remote YouTube
embed compare those delivery paths and cannot isolate player overhead.

[Blender source](https://download.blender.org/durian/trailer/) ·
[Blender attribution requirements](https://durian.blender.org/sharing/) ·
[WebKit fullscreen issue](https://bugs.webkit.org/show_bug.cgi?id=fullscreen-ios)
