import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const track = new URL("../../../../public/lab/player/sintel.en.vtt", import.meta.url);

function seconds(timestamp: string) {
  return timestamp.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

test("the Sintel track covers the late dialogue and music", () => {
  const [header, ...blocks] = readFileSync(track, "utf8")
    .trim()
    .split(/\r?\n\r?\n/);
  assert.equal(header, "WEBVTT");
  const cues = blocks.map((block) => {
    const [timing, ...lines] = block.split(/\r?\n/);
    assert.ok(timing);
    const match = /^(\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}\.\d{3})$/.exec(timing);
    const start = seconds(match?.[1] ?? "");
    const end = seconds(match?.[2] ?? "");
    assert.ok(start < end, `Invalid cue timing: ${timing}`);
    return { start, end, text: lines.join(" ") };
  });
  const cueAt = (position: number) =>
    cues.find(({ start, end }) => start <= position && position < end)?.text;

  assert.equal(cueAt(39), "A dangerous quest for a lone hunter.");
  assert.equal(cueAt(40), "[Music]");
  assert.equal(cueAt(42), "I've been alone for as long as I can remember.");
});
