"""Run: python3 scripts/browser-acceptance/fixtures.py. Fake feeds and player."""

import sys
from subprocess import TimeoutExpired

sys.dont_write_bytecode = True
from harness import (
    BASE,
    OUT,
    SCREENSHOTS,
    SCRIPTS,
    browser,
    fingerprint,
    js,
    json,
    loaded,
    save,
    server,
    shot,
    state,
)

results = {"build": fingerprint(), "screenshotsEnabled": SCREENSHOTS, "checks": []}


def mode(name="loaded", delay=0):
    save("fixture-control", {"mode": name, "delayMs": delay})


def check(name, condition, evidence=None):
    entry = {"check": name, "pass": bool(condition), "evidence": evidence}
    results["checks"].append(entry)
    print(("PASS " if condition else "FAIL ") + name, flush=True)


def open_feed(path="/hustle"):
    browser("open", BASE + path)
    browser(
        "wait",
        "--fn",
        "!!document.querySelector('#video-list [data-active]') && location.pathname.split('/').length===3",
    )


def player():
    return js(
        '({calls:playerFixture.calls,id:playerFixture.current()?.id,players:document.querySelectorAll("[data-fixture-player]").length})'
    )


def next_video():
    browser("find", "role", "button", "click", "--name", "Next video")


def current_id():
    return js('location.pathname.split("/").at(-1)')


def launch():
    browser("open", "--init-script", str(SCRIPTS / "player-fixture.js"))
    # Fixture visits must not count as production analytics traffic.
    for url in [
        "**://www.googletagmanager.com/**",
        "**://www.gstatic.com/firebasejs/**",
        "**://*.google-analytics.com/**",
    ]:
        browser("network", "route", url, "--abort")


def check_player_lifecycle():
    open_feed("/hustle?testApi=manual&testReady=manual&keep=yes#player")
    check(
        "B2 API delayed, not constructed",
        js("playerFixture.apiRequested && playerFixture.players.length===0"),
    )
    next_video()
    before = current_id()
    js("playerFixture.install()")
    browser("wait", "--fn", "playerFixture.players.length===1")
    check(
        "B2 selection before API uses latest constructor ID",
        player()["id"] == before,
        player(),
    )
    next_video()
    next_video()
    latest = current_id()
    check(
        "B2 no cue between construction and ready",
        not any(c[0] == "cue" for c in player()["calls"]),
        player(),
    )
    js("playerFixture.ready()")
    check("B2 ready cues latest ID", player()["id"] == latest, player())

    open_feed("/hustle?keep=yes#player")
    next_video()
    browser("wait", "--fn", "playerFixture.current()?.ready")
    url = js("location.href")
    check(
        "B1 selection preserves search/hash",
        "keep=yes" in url and url.endswith("#player"),
        url,
    )
    end_id = current_id()
    js("playerFixture.end()")
    check("B3 end does not advance", current_id() == end_id)
    js("playerFixture.error()")
    browser(
        "wait",
        "--fn",
        'location.pathname.split("/").at(-1)!==' + json.dumps(end_id),
    )
    check("B3 error skips and cues next", player()["id"] == current_id(), player())


try:
    mode()
    (OUT / "fixture-requests.jsonl").write_text("")
    with server():
        launch()
        browser("set", "viewport", "1440", "900")
        # Start beyond the fold, then advance with a real keyboard event.
        open_feed("/hustle/fx000000040")
        browser("press", "ArrowRight")
        scroll = js(
            '({y:scrollY,list:document.querySelector("[data-radix-scroll-area-viewport]").scrollTop,active:document.querySelector("#video-list [data-active]").getBoundingClientRect().toJSON()})'
        )
        check(
            "U2 desktop selection scrolls only list",
            scroll["y"] == 0 and scroll["list"] > 0,
            scroll,
        )
        check(
            "U2 desktop selected row fully inside browser viewport",
            scroll["active"]["bottom"] <= 901,
            scroll,
        )
        shot("fixture-desktop-deeplink-visible")
        selected_before_nav = current_id()
        mode(delay=1500)
        browser("click", 'a[href="/ai"]')
        pending = js(
            '({status:[...document.querySelectorAll("[role=status]")].map(x=>x.textContent),calls:playerFixture.calls})'
        )
        check(
            "U1 pending names destination and pauses old player",
            any("Loading AI" in s for s in pending["status"])
            and any(c[0] == "pause" for c in pending["calls"]),
            pending,
        )
        shot("fixture-pending-ai-desktop")
        browser(
            "wait",
            "--fn",
            'location.pathname.startsWith("/ai/") && !document.body.innerText.includes("Loading AI")',
        )
        check(
            "U1 navigation completes and unmount destroys player",
            any(c[0] == "destroy" for c in player()["calls"]),
            player(),
        )
        mode()
        browser("back")
        browser("wait", "--fn", 'location.pathname.startsWith("/hustle/")')
        check(
            "B1 Back returns category", "/hustle/" in js("location.pathname"), state()
        )
        check(
            "B1 Back preserves selected video",
            current_id() == selected_before_nav
            and player()["id"] == selected_before_nav,
            {
                "expected": selected_before_nav,
                "actual": current_id(),
                "player": player(),
            },
        )
        shot("fixture-back-selection-confirmed")
        check(
            "B1 Back updates watched-store selection",
            js(
                'JSON.parse(localStorage.getItem("video-storage")).state.currentVideoWatching'
            )
            == selected_before_nav,
        )
        browser("forward")
        browser("wait", "--fn", 'location.pathname.startsWith("/ai/")')
        check("B1 Forward returns category", "/ai/" in js("location.pathname"), state())
        browser("set", "viewport", "390", "844")
        open_feed("/hustle/fx000000040?keep=yes#player")
        check(
            "U2 mobile initial deep link stays at top",
            js("scrollY") == 0 and current_id() == "fx000000040",
            state(),
        )
        for _ in range(3):
            next_video()
        check(
            "U2 mobile next past fold does not move document",
            js("scrollY") == 0,
            state(),
        )
        shot("fixture-mobile-deeplink-past-fold")
        browser("focus", 'button[aria-label="Open navigation menu"]')
        browser("press", "Enter")
        browser("wait", "[role=dialog]")
        shot("fixture-mobile-menu-keyboard")
        check(
            "U3 keyboard opens named menu",
            js('!!document.querySelector("[role=dialog]")'),
        )
        browser("press", "Escape")
        browser(
            "wait",
            "--fn",
            '!document.querySelector("[role=dialog]") && document.activeElement?.getAttribute("aria-label")==="Open navigation menu"',
        )
        check(
            "U3 Escape restores trigger focus",
            js(
                'document.activeElement?.getAttribute("aria-label")==="Open navigation menu"'
            ),
        )
        browser("press", "Enter")
        browser("wait", "[role=dialog]")
        browser("focus", '[role=dialog] a[href="/crypto"]')
        browser("press", "Enter")
        browser(
            "wait",
            "--fn",
            'location.pathname.startsWith("/crypto/") && !document.querySelector("[role=dialog]")',
        )
        check("U3 keyboard selects category and closes menu", True, state())
        browser("set", "viewport", "1440", "900")
        open_feed("/hustle?testApi=fail")
        browser("wait", "--text", "The YouTube player could not load.")
        check(
            "B2 API script load error visible with source link",
            js('!!document.querySelector("a[href*=youtube][target=_blank]")'),
            state(),
        )
        shot("fixture-player-api-failure")
        # New document per case avoids carrying Zustand state between seeds.
        seeds = [
            ("legacy", ["fx000000004", "legacy-id"], None),
            ("new", None, ["fx000000008", "new-id"]),
            ("both", ["fx000000004", "shared"], ["shared", "fx000000008"]),
            ("malformed", "{broken", ["fx000000008", "new-id"]),
        ]
        for name, legacy, new in seeds:
            open_feed()
            raw = (
                legacy
                if isinstance(legacy, str)
                else json.dumps(legacy)
                if legacy is not None
                else None
            )
            seed = {
                "legacy": raw,
                "new": json.dumps(
                    {
                        "state": {
                            "watchedVideos": new,
                            "clickedVideos": [],
                            "currentVideoWatching": "",
                        },
                        "version": 0,
                    }
                )
                if new
                else None,
            }
            js(
                '(() => {localStorage.removeItem("videosWatched");localStorage.removeItem("video-storage"); const s='
                + json.dumps(seed)
                + '; if(s.legacy!==null)localStorage.setItem("videosWatched",s.legacy);if(s.new!==null)localStorage.setItem("video-storage",s.new);})()'
            )
            browser("reload")
            browser(
                "wait", "--fn", '!!document.querySelector("#video-list [data-active]")'
            )
            next_video()
            browser("reload")
            browser(
                "wait", "--fn", '!!document.querySelector("#video-list [data-active]")'
            )
            stored = js(
                '({legacy:localStorage.getItem("videosWatched"),state:JSON.parse(localStorage.getItem("video-storage")).state,watched:document.querySelectorAll("#video-list .opacity-50").length,activeBadge:document.querySelector("#video-list [data-active]").textContent.includes("WATCHED")})'
            )
            expected = set((legacy if isinstance(legacy, list) else []) + (new or []))
            watched = stored["state"]["watchedVideos"]
            check(
                "B4 " + name + " union/dedup/reload/legacy intact",
                expected.issubset(watched)
                and len(watched) == len(set(watched))
                and stored["legacy"] == raw
                and not stored["activeBadge"],
                stored,
            )
        shot("fixture-watched-storage")

        # Resize the same document across 768px; identity must survive player recreation.
        open_feed("/hustle/fx000000040")
        next_video()
        selected = current_id()
        for width, height, label in [
            (1440, 900, "desktop-watched"),
            (390, 844, "mobile-watched"),
            (390, 568, "short-portrait"),
            (844, 390, "short-landscape"),
            (767, 844, "below-768"),
            (768, 844, "at-768"),
            (390, 844, "crossing-mobile"),
        ]:
            browser("set", "viewport", str(width), str(height))
            browser(
                "wait",
                "--fn",
                'document.querySelectorAll("[data-fixture-player]").length===1 && playerFixture.current()?.ready && !!document.querySelector("#video-list")?.closest("[data-radix-scroll-area-viewport]")==='
                + str(width >= 768).lower(),
            )
            metrics = js("""(() => {
              const row=document.querySelector('#video-list [data-active]').getBoundingClientRect();
              const next=document.querySelector('[aria-label="Next video"]').getBoundingClientRect();
              const title=document.querySelector('a[href*="youtube.com/watch"]').getBoundingClientRect();
              const viewport=document.querySelector('#video-list').closest('[data-radix-scroll-area-viewport]');
              return {id:playerFixture.current().id,players:document.querySelectorAll('[data-fixture-player]').length,
                row:row.toJSON(),next:next.toJSON(),title:title.toJSON(),scrollY,
                documentWidth:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight,
                listBottom:viewport?.getBoundingClientRect().bottom,theme:document.documentElement.className};
            })()""")
            check(
                "B5 " + label + " identity, single player, controls and width",
                metrics["id"] == selected
                and metrics["players"] == 1
                and metrics["next"]["height"] > 0
                and metrics["next"]["bottom"] <= height + 1
                and metrics["title"]["height"] > 0
                and metrics["documentWidth"] <= width + 1,
                metrics,
            )
            check(
                "U2 " + label + " no document movement / desktop selection visible",
                metrics["scrollY"] == 0
                and (
                    width < 768
                    or (
                        metrics["row"]["top"] >= 0
                        and metrics["row"]["bottom"] <= height + 1
                    )
                ),
                metrics,
            )
            shot("fixture-" + label)

        js('localStorage.setItem("theme","light")')
        for width, height, label in [
            (1440, 900, "desktop-light"),
            (390, 844, "mobile-light"),
        ]:
            browser("set", "viewport", str(width), str(height))
            browser("reload")
            browser(
                "wait",
                "--fn",
                'document.documentElement.classList.contains("light") && playerFixture.current()?.ready',
            )
            check(
                "B5 " + label + " theme and player",
                player()["players"] == 1
                and js('document.documentElement.classList.contains("light")'),
                state(),
            )
            shot("fixture-" + label)
        js('localStorage.setItem("theme","dark")')
        open_feed("/hustle")
        mode(delay=1500)
        browser("focus", 'button[aria-label="Open navigation menu"]')
        browser("press", "Enter")
        browser("wait", "[role=dialog]")
        browser("focus", '[role=dialog] a[href="/ai"]')
        browser("press", "Enter")
        browser("wait", "--fn", 'document.body.innerText.includes("Loading AI")')
        check(
            "U1 mobile pending pauses old player",
            any(c[0] == "pause" for c in player()["calls"]),
            state(),
        )
        shot("fixture-pending-ai-mobile")
        browser(
            "wait",
            "--fn",
            'location.pathname.startsWith("/ai/") && !document.body.innerText.includes("Loading AI")',
        )
        mode()
        browser("set", "viewport", "1440", "900")
        for name, text in [
            ("empty", "No videos are available"),
            ("denied", "YouTube denied access"),
            ("quota", "YouTube's API quota has been reached"),
            ("network", "Some YouTube videos could not be retrieved"),
            ("partial", "Showing available videos"),
        ]:
            mode(name)
            browser("open", BASE + "/hustle")
            browser("wait", "--text", text)
            st = state()
            check(
                "D1 " + name,
                any(text in m for m in st["messages"])
                and (st["rows"] > 0 if name == "partial" else st["rows"] == 0),
                st,
            )
            shot("fixture-feed-" + name)
        mode()
        open_feed()
        durations = js(
            '[...document.querySelectorAll("#video-list button")].map(x=>x.textContent)'
        )
        check(
            "D2 optional duration fields included; <=120 seconds excluded",
            len(durations) == 60
            and any("PT3M" in s for s in durations)
            and any("PT1H" in s for s in durations)
            and all("PT2M" not in s and "PT1M59S" not in s for s in durations),
            {"rows": len(durations), "first": durations[:4]},
        )
        check(
            "B6 newest-first ordering",
            [" ".join(s.replace("WATCHED", "").split()) for s in durations]
            == sorted([" ".join(s.replace("WATCHED", "").split()) for s in durations]),
        )
        for path, suffix in [
            (
                "/hustle?v=fx000000004&keep=yes#player",
                "/hustle/fx000000004?v=fx000000004&keep=yes#player",
            ),
            ("/hustle/not-in-feed", "/hustle/fx000000000"),
            (
                "/?p=/hustle/fx000000008&q=keep=yes~and~v=fx000000008#player",
                "/hustle/fx000000008?keep=yes&v=fx000000008#player",
            ),
            ("/?p=//evil.invalid", "/hustle/fx000000000"),
            ("/?p=/hustle%GG", "/hustle/fx000000000"),
            ("/reddit/old-video", "/hustle/fx000000000"),
        ]:
            open_feed(path)
            check("R2/B1 " + path, js("location.href") == BASE + suffix, state())
        browser("open", BASE + "/?p=/r/videos/post-id&q=sort=hot#player")
        loaded()
        check(
            "R2 subreddit shim preserves query and fragment",
            js("location.href") == BASE + "/r/videos/post-id?sort=hot#player",
            state(),
        )
        for path, canonical, noindex in [
            ("/ai", "/ai", False),
            ("/ai/fx000000120", "/ai/fx000000120", False),
            ("/ai?v=fx000000120", "/ai/fx000000120", False),
            ("/r/videos", "/r/videos", True),
            ("/r/videos/post-id", "/r/videos/post-id", True),
        ]:
            browser("open", BASE + path)
            loaded()
            st = state()
            check(
                "L4 " + path,
                st.get("canonical") == "https://walnut.tv" + canonical
                and st.get("ogImage") == "https://walnut.tv/walnut.tv-og-image.png"
                and st.get("twitterImage") == st.get("ogImage")
                and (not noindex or "noindex" in st.get("robots", "")),
                st,
            )
        http = js(
            'Promise.all(["/unknown-channel","/unknown-channel/id","/favicon.ico","/site.webmanifest","/favicon-32x32.png","/favicon-16x16.png","/apple-touch-icon.png","/walnut.tv-og-image.png","/sitemap.xml","/robots.txt"].map(async p=>{const r=await fetch(p);return {path:p,status:r.status,text:p.endsWith(".xml")||p.endsWith(".txt")?await r.text():undefined}}))'
        )
        check(
            "B1 HTTP unknown routes 404; L4 assets 200",
            all(
                r["status"] == (404 if r["path"].startswith("/unknown") else 200)
                for r in http
            ),
            http,
        )
        manifest = js(
            'fetch("/site.webmanifest").then(r=>r.json()).then(async m=>({icons:await Promise.all(m.icons.map(async i=>({src:i.src,status:(await fetch(i.src)).status})))}))'
        )
        check(
            "L4 manifest icons return 200",
            bool(manifest["icons"])
            and all(i["status"] == 200 for i in manifest["icons"]),
            manifest,
        )
        sitemap = next(r["text"] for r in http if r["path"] == "/sitemap.xml")
        check(
            "L4 sitemap contains configured categories and excludes Reddit",
            all("https://walnut.tv/" + c in sitemap for c in ["hustle", "ai", "crypto"])
            and "/r/" not in sitemap,
            sitemap,
        )
        save("fixture-final-state", state())
        try:
            check_player_lifecycle()
        except (RuntimeError, TimeoutExpired) as error:
            check("B2/B3 lifecycle (browser interrupted)", False, str(error))
            browser("close")
            launch()
        # Keep the dense keyboard probe last so a browser interruption retains other evidence.
        open_feed("/hustle?testApi=manual&testReady=manual&keep=yes#player")
        next_video()
        js("playerFixture.install()")
        browser("wait", "--fn", "playerFixture.players.length===1")
        next_video()
        next_video()
        js("playerFixture.ready()")
        try:
            for _ in range(3):
                browser("press", "ArrowRight")
            snapshot = player()
            url = js("location.href")
            if not url.startswith(BASE):
                raise RuntimeError("Browser left the fixture origin: " + url)
            check(
                "B2 rapid keyboard selection stays synchronized",
                snapshot["id"] == current_id() and snapshot["players"] == 1,
                snapshot,
            )
        except (RuntimeError, TimeoutExpired) as error:
            check(
                "B2 rapid keyboard selection (browser interrupted)", False, str(error)
            )
    with server(missing_config=True):
        launch()
        browser("open", BASE + "/hustle")
        browser("set", "viewport", "1440", "900")
        browser(
            "wait",
            "--text",
            "YouTube browsing is unavailable because it is not configured.",
        )
        check("D1 missing configuration", state()["rows"] == 0, state())
        shot("fixture-feed-missing-config")
except Exception as e:
    results["fatal"] = str(e)
    print("BLOCKER:", e, flush=True)
finally:
    results["summary"] = {
        "passed": sum(c["pass"] for c in results["checks"]),
        "failed": sum(not c["pass"] for c in results["checks"]),
    }
    save("fixture-results", results)
    print(json.dumps(results["summary"]), "Evidence:", OUT, flush=True)

raise SystemExit(
    1 if results.get("fatal") or any(not c["pass"] for c in results["checks"]) else 0
)
