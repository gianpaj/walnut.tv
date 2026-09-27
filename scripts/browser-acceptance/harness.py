"""Bounded, dependency-free harness for an isolated production Next server."""

import hashlib
import json
import os
import signal
import socket
import subprocess
import time
import urllib.request
from contextlib import contextmanager
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parents[1]
OUT = Path(
    os.environ.get("BROWSER_ACCEPTANCE_OUT", ROOT / ".next/browser-acceptance")
).resolve()
OUT.mkdir(parents=True, exist_ok=True)
PORT = int(os.environ.get("BROWSER_ACCEPTANCE_PORT", "3100"))
BASE = f"http://127.0.0.1:{PORT}"
SESSION = f"walnut-acceptance-{os.getpid()}"
SCREENSHOTS = os.environ.get("BROWSER_ACCEPTANCE_SCREENSHOTS", "1") != "0"


def browser(*args, optional=False):
    p = subprocess.run(
        [
            "agent-browser",
            *(
                ["--headed"]
                if os.environ.get("BROWSER_ACCEPTANCE_HEADED") == "1"
                else []
            ),
            "--session",
            SESSION,
            "--idle-timeout",
            "10m",
            "--args",
            "--disable-background-timer-throttling,--disable-renderer-backgrounding,--disable-backgrounding-occluded-windows",
            "--json",
            *args,
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=40,
    )
    try:
        response = json.loads(p.stdout)
    except ValueError:
        response = {"success": False, "error": p.stdout[-500:]}
    lifecycle = (response.get("data") or {}).get("lifecycle", {})
    with (OUT / "browser-lifecycle.jsonl").open("a") as log:
        log.write(
            json.dumps({"session": SESSION, "command": args[0], "lifecycle": lifecycle})
            + "\n"
        )
    if args[0] not in ("open", "close") and lifecycle.get("relaunchedBrowser"):
        raise RuntimeError(
            "Browser relaunched during a check; see browser-lifecycle.jsonl"
        )
    if not optional and (p.returncode or not response.get("success", True)):
        raise RuntimeError(f"browser {args[0]}: {response}")
    return response.get("data") or response


def js(code):
    return browser("eval", code).get("result")


def shot(name):
    if not SCREENSHOTS:
        return
    destination = OUT / (name + ".png")
    result = browser("screenshot", "--screenshot-dir", str(OUT), str(destination))
    actual = Path(result.get("path", destination))
    if actual != destination:
        destination.write_bytes(actual.read_bytes())
    if not destination.exists():
        raise RuntimeError(f"Screenshot missing: {destination}")


def save(name, data):
    (OUT / (name + ".json")).write_text(json.dumps(data, indent=2) + "\n")


def state():
    return js("""(() => ({url:location.href, title:document.title,
      rows:document.querySelectorAll('#video-list button').length,
      active:document.querySelector('#video-list [data-active]')?.textContent,
      messages:[...document.querySelectorAll('h2,[role=status]')].map(x=>x.textContent),
      players:document.querySelectorAll('[data-fixture-player]').length,
      scrollY, viewport:[innerWidth,innerHeight], theme:document.documentElement.className,
      canonical:document.querySelector('link[rel=canonical]')?.href,
      ogImage:document.querySelector('meta[property="og:image"]')?.content,
      twitterImage:document.querySelector('meta[name="twitter:image"]')?.content,
      robots:document.querySelector('meta[name=robots]')?.content,
      assets:[...document.querySelectorAll('link[rel=icon],link[rel=manifest],link[rel=apple-touch-icon]')].map(x=>x.getAttribute('href'))
    }))()""")


def loaded():
    browser("wait", "--fn", "!!document.querySelector('#video-list button,h2')")


@contextmanager
def server(missing_config=False):
    # SO_REUSEADDR permits TIME_WAIT reuse, not taking over an active listener.
    with socket.socket() as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("127.0.0.1", PORT))
    env = os.environ.copy()
    env["YOUTUBE_API_KEY"] = "" if missing_config else "acceptance-fixture-not-a-secret"
    env["BROWSER_ACCEPTANCE_OUT"] = str(OUT)
    child = subprocess.Popen(
        [
            "node",
            "--require",
            str(SCRIPTS / "fetch-fixture.cjs"),
            "node_modules/next/dist/bin/next",
            "start",
            "--hostname",
            "127.0.0.1",
            "--port",
            str(PORT),
        ],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )

    def interrupt(*_):
        raise TimeoutError(
            "Acceptance server exceeded its 8-minute limit or was interrupted"
        )

    previous = {
        sig: signal.signal(sig, interrupt) for sig in (signal.SIGTERM, signal.SIGALRM)
    }
    signal.alarm(480)
    try:
        for _ in range(100):
            if child.poll() is not None:
                raise RuntimeError("Isolated Next server exited")
            try:
                urllib.request.urlopen(BASE + "/favicon.ico", timeout=1).close()
                break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Server startup timed out")
        yield
    finally:
        signal.alarm(0)
        try:
            # Retry only this process's session if a timed-out action delayed close.
            try:
                browser("close")
            except (subprocess.TimeoutExpired, RuntimeError):
                browser("close")
        finally:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
            for sig, handler in previous.items():
                signal.signal(sig, handler)


def fingerprint():
    digest = hashlib.sha256()
    paths = sorted(
        [
            *ROOT.joinpath("src").rglob("*"),
            ROOT / "channels.js",
            ROOT / "next.config.mjs",
        ]
    )
    for path in paths:
        if path.is_file():
            digest.update(
                str(path.relative_to(ROOT)).encode() + b"\0" + path.read_bytes()
            )
    return {
        "head": subprocess.check_output(
            ["git", "--no-pager", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "buildId": (ROOT / ".next/BUILD_ID").read_text().strip(),
        "sourceSha256": digest.hexdigest(),
        "browserCLI": subprocess.check_output(
            ["agent-browser", "--version"], text=True
        ).strip(),
        "session": SESSION,
    }
