// Instrumented IFrame API test double. Does not establish real YouTube playback.
(() => {
  if (location.hostname !== "127.0.0.1") return;
  const query = new URLSearchParams(location.search);
  const api = query.get("testApi");
  const f = (window.playerFixture = { calls: [], players: [], apiRequested: false });
  f.install = () => {
    window.YT = {
      PlayerState: { ENDED: 0 },
      Player: class {
        constructor(target, options) {
          this.options = options;
          this.id = options.videoId;
          this.ready = false;
          this.node = document.createElement("div");
          this.node.dataset.fixturePlayer = "";
          this.node.style.cssText = "height:100%;background:#17202c;color:white;padding:24px";
          this.node.textContent = "YOUTUBE TEST DOUBLE — " + this.id;
          target.replaceWith(this.node);
          f.players.push(this);
          f.calls.push(["construct", this.id]);
          if (query.get("testReady") !== "manual") queueMicrotask(() => this.makeReady());
        }
        makeReady() {
          this.ready = true;
          this.options.events.onReady({ target: this });
        }
        cueVideoById(id) {
          if (!this.ready) throw new Error("cue before ready");
          this.id = id;
          this.node.textContent = "YOUTUBE TEST DOUBLE — " + id;
          f.calls.push(["cue", id]);
        }
        pauseVideo() {
          f.calls.push(["pause", this.id]);
        }
        destroy() {
          f.calls.push(["destroy", this.id]);
          this.node.remove();
        }
      },
    };
    window.onYouTubeIframeAPIReady?.();
  };
  f.current = () => f.players.at(-1);
  f.ready = () => f.current().makeReady();
  f.error = () => f.current().options.events.onError({ target: f.current(), data: 100 });
  f.end = () => f.current().options.events.onStateChange({ target: f.current(), data: 0 });
  if (!api) f.install();
  else {
    const append = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
      if (node.tagName === "SCRIPT" && node.src === "https://www.youtube.com/iframe_api") {
        f.apiRequested = true;
        if (api === "fail") queueMicrotask(() => node.dispatchEvent(new Event("error")));
        return node;
      }
      return append.call(this, node);
    };
  }
})();
