const youtubeURL = "http://www.youtube.com/watch?v=";
const youtubeURLLength = youtubeURL.length;
const embedLength = "/embed/".length;

function RedditVideoService() {
  function isVideoObject({ data }) {
    // reddit videos
    if (data.is_video === true) return true;

    // debug only - return only reddit videos
    // return false;

    if (data.media !== null) {
      return (
        data.media.type.includes("youtube.com") ||
        data.media.type.includes("vimeo.com")
      );
    }
    return false;
  }

  function filterByUpvotes(video, upsMin) {
    return video.data.ups >= upsMin;
  }

  function childObjectToDomainVideoModel({ data }) {
    const result = {};
    result.title = data.title;
    result.id = data.id;
    result.permalink = data.permalink;
    result.created_utc = data.created_utc;

    // if (data.preview && data.preview.images) {
    //   const images = data.preview.images[0].resolutions;
    //   result.posterSource = images[images.length - 1].url;
    // }

    // reddit video
    if (data.is_video) {
      result.videoUrl = data.media.reddit_video.fallback_url;
      result.type = "reddit";
      return result;
    }

    // if (data.media === undefined) {
    //   return {};
    // }

    // youtube video
    if (data.media.type === "youtube.com") {
      const { oembed } = data.media;
      result.type = "youtube";

      if (oembed.url && oembed.url.indexOf(youtubeURL) === 0) {
        return (result.videoUrl = oembed.html.substring(youtubeURLLength));
      } else {
        const { html } = oembed;
        const startIndex = html.indexOf("/embed/") + embedLength;
        const endIndex = html.indexOf("?");
        result.videoUrl = html.substring(startIndex, endIndex);
        result.youtubeId = html.substring(startIndex, endIndex);
      }
    }

    // vimeo video
    if (data.media.type === "vimeo.com") {
      result.videoUrl = "vimeo.com";
      result.type = "vimeo";
    }

    return result;
  }

  function dynamicSort(property) {
    let sortOrder = 1;
    if (property[0] === "-") {
      sortOrder = -1;
      property = property.substr(1);
    }
    return function(a, b) {
      const result =
        a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
      return result * sortOrder;
    };
  }

  function _loadHot(channel, upsMin, after) {
    return new Promise((result, reject) => {
      if (typeof channel !== "string") {
        return reject(
          new Error("Bad channel argument value. Channel should be a string")
        );
      }
      let query = reddit.hot(channel).limit(50);
      if (after) query = query.after(after);

      query.fetch(
        res => {
          if (res.error) return reject(res)
          let videos = res.data.children.filter(isVideoObject);

          if (upsMin) {
            videos = videos.filter(vid => filterByUpvotes(vid, upsMin));
          }

          videos = videos
            .map(childObjectToDomainVideoModel)
            .filter(v => v.type === "youtube");

          result(videos);
        },
        // err contains the error from Reddit
        err => reject(err)
      );
    });
  }

  /**
   * e.g.
   * arrayOfArrays =
   * [[1,2,3], [4,5,6,7,8], [9,10]]
   *
   * return
   * [1, 4, 9, 2, 5, 10, 3, 6, 7, 8]
   *
   * TODO: if we skipped the video of a channel the 2nd video
   */
  function getOneVideoOfEachChannel(arrayOfArrays) {
    // find the smallest amount of videos for every channel
    const leastAmountOfVids = Math.min.apply(
      null,
      arrayOfArrays.map(arr => arr.length)
    );

    if (arrayOfArrays.length === 1) {
      // if (__DEV__) console.warn("skipping", arrayOfArrays[0]);
      return arrayOfArrays;
    }

    let videos = [];
    // get one video of each channel in rotation
    for (let i = 0; i < leastAmountOfVids; i++) {
      for (let j = 0; j < arrayOfArrays.length; j++) {
        const vid = arrayOfArrays[j][i];
        videos.push(vid);
      }
    }
    // get the rest of videos
    for (let k = 0; k < arrayOfArrays.length; k++) {
      const vid = arrayOfArrays[k].slice(leastAmountOfVids);
      videos.push(...vid);
    }

    return videos;
  }

  /**
   * Get videos from subreddit(s)
   *
   * @param {string} channel_s one or more channels - e.g. 'funny' or' 'funny;cool'
   * @param {number} upsMin minimum amount of up votes per video
   * @param {*} after reddit id to load more videos
   */
  async function loadHot(channel_s, upsMin, after) {
    // TODO: implement "after" for multiple channels
    channel_s = channel_s.split(";");
    // console.warn("fetching", channel_s.length, "channels");
    const promises = channel_s.map(channel => _loadHot(channel, upsMin));

    const arrayOfArrayOfVideos = await Promise.all(promises);

    let videos = getOneVideoOfEachChannel(arrayOfArrayOfVideos);

    const uniq = {};
    // remove duplicate videos
    videos = videos.filter(
      arr => !uniq[arr.videoUrl] && (uniq[arr.videoUrl] = true)
    );

    return [].concat.apply([], videos);
    // .sort(dynamicSort("created_utc"));
  }

  // public interface
  return {
    loadHot
  };
};

const redditVideoService = new RedditVideoService();

const channels = [
  {
    title: "general",
    subreddit: "videos",
    textColor: "white",
    minNumOfVotes: 50
  },
  {
    title: "curious",
    subreddit: "curiousvideos;mealtimevideos;educativevideos;watchandlearn",
    textColor: "",
    bgColor: "#ff496b",
    minNumOfVotes: 3
  },
  {
    title: "educational",
    subreddit: "physics;math;psychology;space;biology",
    textColor: "",
    bgColor: "#2b80ff",
    minNumOfVotes: 0
  },
  {
    title: "documentaries",
    subreddit: "documentaries",
    textColor: "",
    bgColor: "#ff7200",
    minNumOfVotes: 0
  },
  {
    title: "lectures",
    subreddit: "lectures",
    textColor: "",
    bgColor: "#9d00ff",
    minNumOfVotes: 0
  },
  {
    title: "how to",
    subreddit:
      "maker;howto;artisanvideos;TechDIY;specializedtools;upcycling;DIY;easyfix;woodworking;FastWorkers;lifehacks;tinyhouses",
    textColor: "",
    bgColor: "#00ffe9",
    minNumOfVotes: 0
  },
  {
    title: "shorts",
    subreddit: "filmmakers;shortfilms;shortfilm;shorthorror",
    textColor: "",
    bgColor: "#ff294b",
    minNumOfVotes: 3
  },
  {
    title: "gaming",
    subreddit: "PromoteGamingVideos;gamingvids;YouTubeGamers;PromoteYoutubeGaming",
    textColor: "",
    bgColor: "#FFFF00",
    minNumOfVotes: 5
  },
  {
    title: "music",
    subreddit: "listentothis",
    textColor: "",
    bgColor: "#FFFF00",
    minNumOfVotes: 5
  }
];



function onYouTubeIframeAPIReady() {
  player = new YT.Player("player",{
    height: "390",
    width: "640",
    videoId: youtubeId,
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    },
    playerVars: {
      controls: 1,
      showinfo: 0,
      rel: 0,
      iv_load_policy: 3,
      origin: "https://rake.tv"
    }
  })
}
function onPlayerReady(t) {
  appVideo.videoList[0] && appVideo.play(0)
}
function onPlayerError() {
  appVideo.nextVideo()
}
function onPlayerStateChange(t) {
  0 === t.data && appVideo.autoplay && appVideo.nextVideo()
}
if (!function(t, e) {
  "object" == typeof module && "object" == typeof module.exports ? module.exports = t.document ? e(t, !0) : function(t) {
    if (!t.document)
      throw new Error("jQuery requires a window with a document");
    return e(t)
  }
  : e(t)
}
("undefined" != typeof window ? window : this, function(t, e) {
  function n(t) {
    var e = "length"in t && t.length
      , n = rt.type(t);
    return "function" === n || rt.isWindow(t) ? !1 : 1 === t.nodeType && e ? !0 : "array" === n || 0 === e || "number" == typeof e && e > 0 && e - 1 in t
  }
  function i(t, e, n) {
    if (rt.isFunction(e))
      return rt.grep(t, function(t, i) {
        return !!e.call(t, i, t) !== n
      });
    if (e.nodeType)
      return rt.grep(t, function(t) {
        return t === e !== n
      });
    if ("string" == typeof e) {
      if (dt.test(e))
        return rt.filter(e, t, n);
      e = rt.filter(e, t)
    }
    return rt.grep(t, function(t) {
      return rt.inArray(t, e) >= 0 !== n
    })
  }
  function r(t, e) {
    do
      t = t[e];
    while (t && 1 !== t.nodeType);return t
  }
  function o(t) {
    var e = _t[t] = {};
    return rt.each(t.match(bt) || [], function(t, n) {
      e[n] = !0
    }),
    e
  }
  function s() {
    pt.addEventListener ? (pt.removeEventListener("DOMContentLoaded", a, !1),
    t.removeEventListener("load", a, !1)) : (pt.detachEvent("onreadystatechange", a),
    t.detachEvent("onload", a))
  }
  function a() {
    (pt.addEventListener || "load" === event.type || "complete" === pt.readyState) && (s(),
    rt.ready())
  }
  function l(t, e, n) {
    if (void 0 === n && 1 === t.nodeType) {
      var i = "data-" + e.replace(Tt, "-$1").toLowerCase();
      if (n = t.getAttribute(i),
      "string" == typeof n) {
        try {
          n = "true" === n ? !0 : "false" === n ? !1 : "null" === n ? null : +n + "" === n ? +n : Ct.test(n) ? rt.parseJSON(n) : n
        } catch (r) {}
        rt.data(t, e, n)
      } else
        n = void 0
    }
    return n
  }
  function u(t) {
    var e;
    for (e in t)
      if (("data" !== e || !rt.isEmptyObject(t[e])) && "toJSON" !== e)
        return !1;
    return !0
  }
  function c(t, e, n, i) {
    if (rt.acceptData(t)) {
      var r, o, s = rt.expando, a = t.nodeType, l = a ? rt.cache : t, u = a ? t[s] : t[s] && s;
      if (u && l[u] && (i || l[u].data) || void 0 !== n || "string" != typeof e)
        return u || (u = a ? t[s] = G.pop() || rt.guid++ : s),
        l[u] || (l[u] = a ? {} : {
          toJSON: rt.noop
        }),
        ("object" == typeof e || "function" == typeof e) && (i ? l[u] = rt.extend(l[u], e) : l[u].data = rt.extend(l[u].data, e)),
        o = l[u],
        i || (o.data || (o.data = {}),
        o = o.data),
        void 0 !== n && (o[rt.camelCase(e)] = n),
        "string" == typeof e ? (r = o[e],
        null == r && (r = o[rt.camelCase(e)])) : r = o,
        r
    }
  }
  function h(t, e, n) {
    if (rt.acceptData(t)) {
      var i, r, o = t.nodeType, s = o ? rt.cache : t, a = o ? t[rt.expando] : rt.expando;
      if (s[a]) {
        if (e && (i = n ? s[a] : s[a].data)) {
          rt.isArray(e) ? e = e.concat(rt.map(e, rt.camelCase)) : e in i ? e = [e] : (e = rt.camelCase(e),
          e = e in i ? [e] : e.split(" ")),
          r = e.length;
          for (; r--; )
            delete i[e[r]];
          if (n ? !u(i) : !rt.isEmptyObject(i))
            return
        }
        (n || (delete s[a].data,
        u(s[a]))) && (o ? rt.cleanData([t], !0) : nt.deleteExpando || s != s.window ? delete s[a] : s[a] = null)
      }
    }
  }
  function d() {
    return !0
  }
  function f() {
    return !1
  }
  function p() {
    try {
      return pt.activeElement
    } catch (t) {}
  }
  function m(t) {
    var e = Pt.split("|")
      , n = t.createDocumentFragment();
    if (n.createElement)
      for (; e.length; )
        n.createElement(e.pop());
    return n
  }
  function g(t, e) {
    var n, i, r = 0, o = typeof t.getElementsByTagName !== kt ? t.getElementsByTagName(e || "*") : typeof t.querySelectorAll !== kt ? t.querySelectorAll(e || "*") : void 0;
    if (!o)
      for (o = [],
      n = t.childNodes || t; null != (i = n[r]); r++)
        !e || rt.nodeName(i, e) ? o.push(i) : rt.merge(o, g(i, e));
    return void 0 === e || e && rt.nodeName(t, e) ? rt.merge([t], o) : o
  }
  function v(t) {
    Ot.test(t.type) && (t.defaultChecked = t.checked)
  }
  function y(t, e) {
    return rt.nodeName(t, "table") && rt.nodeName(11 !== e.nodeType ? e : e.firstChild, "tr") ? t.getElementsByTagName("tbody")[0] || t.appendChild(t.ownerDocument.createElement("tbody")) : t
  }
  function b(t) {
    return t.type = (null !== rt.find.attr(t, "type")) + "/" + t.type,
    t
  }
  function _(t) {
    var e = zt.exec(t.type);
    return e ? t.type = e[1] : t.removeAttribute("type"),
    t
  }
  function w(t, e) {
    for (var n, i = 0; null != (n = t[i]); i++)
      rt._data(n, "globalEval", !e || rt._data(e[i], "globalEval"))
  }
  function x(t, e) {
    if (1 === e.nodeType && rt.hasData(t)) {
      var n, i, r, o = rt._data(t), s = rt._data(e, o), a = o.events;
      if (a) {
        delete s.handle,
        s.events = {};
        for (n in a)
          for (i = 0,
          r = a[n].length; r > i; i++)
            rt.event.add(e, n, a[n][i])
      }
      s.data && (s.data = rt.extend({}, s.data))
    }
  }
  function k(t, e) {
    var n, i, r;
    if (1 === e.nodeType) {
      if (n = e.nodeName.toLowerCase(),
      !nt.noCloneEvent && e[rt.expando]) {
        r = rt._data(e);
        for (i in r.events)
          rt.removeEvent(e, i, r.handle);
        e.removeAttribute(rt.expando)
      }
      "script" === n && e.text !== t.text ? (b(e).text = t.text,
      _(e)) : "object" === n ? (e.parentNode && (e.outerHTML = t.outerHTML),
      nt.html5Clone && t.innerHTML && !rt.trim(e.innerHTML) && (e.innerHTML = t.innerHTML)) : "input" === n && Ot.test(t.type) ? (e.defaultChecked = e.checked = t.checked,
      e.value !== t.value && (e.value = t.value)) : "option" === n ? e.defaultSelected = e.selected = t.defaultSelected : ("input" === n || "textarea" === n) && (e.defaultValue = t.defaultValue)
    }
  }
  function C(e, n) {
    var i, r = rt(n.createElement(e)).appendTo(n.body), o = t.getDefaultComputedStyle && (i = t.getDefaultComputedStyle(r[0])) ? i.display : rt.css(r[0], "display");
    return r.detach(),
    o
  }
  function T(t) {
    var e = pt
      , n = Kt[t];
    return n || (n = C(t, e),
    "none" !== n && n || (Zt = (Zt || rt("<iframe frameborder='0' width='0' height='0'/>")).appendTo(e.documentElement),
    e = (Zt[0].contentWindow || Zt[0].contentDocument).document,
    e.write(),
    e.close(),
    n = C(t, e),
    Zt.detach()),
    Kt[t] = n),
    n
  }
  function $(t, e) {
    return {
      get: function() {
        var n = t();
        return null != n ? n ? void delete this.get : (this.get = e).apply(this, arguments) : void 0
      }
    }
  }
  function S(t, e) {
    if (e in t)
      return e;
    for (var n = e.charAt(0).toUpperCase() + e.slice(1), i = e, r = de.length; r--; )
      if (e = de[r] + n,
      e in t)
        return e;
    return i
  }
  function D(t, e) {
    for (var n, i, r, o = [], s = 0, a = t.length; a > s; s++)
      i = t[s],
      i.style && (o[s] = rt._data(i, "olddisplay"),
      n = i.style.display,
      e ? (o[s] || "none" !== n || (i.style.display = ""),
      "" === i.style.display && Dt(i) && (o[s] = rt._data(i, "olddisplay", T(i.nodeName)))) : (r = Dt(i),
      (n && "none" !== n || !r) && rt._data(i, "olddisplay", r ? n : rt.css(i, "display"))));
    for (s = 0; a > s; s++)
      i = t[s],
      i.style && (e && "none" !== i.style.display && "" !== i.style.display || (i.style.display = e ? o[s] || "" : "none"));
    return t
  }
  function E(t, e, n) {
    var i = le.exec(e);
    return i ? Math.max(0, i[1] - (n || 0)) + (i[2] || "px") : e
  }
  function O(t, e, n, i, r) {
    for (var o = n === (i ? "border" : "content") ? 4 : "width" === e ? 1 : 0, s = 0; 4 > o; o += 2)
      "margin" === n && (s += rt.css(t, n + St[o], !0, r)),
      i ? ("content" === n && (s -= rt.css(t, "padding" + St[o], !0, r)),
      "margin" !== n && (s -= rt.css(t, "border" + St[o] + "Width", !0, r))) : (s += rt.css(t, "padding" + St[o], !0, r),
      "padding" !== n && (s += rt.css(t, "border" + St[o] + "Width", !0, r)));
    return s
  }
  function A(t, e, n) {
    var i = !0
      , r = "width" === e ? t.offsetWidth : t.offsetHeight
      , o = te(t)
      , s = nt.boxSizing && "border-box" === rt.css(t, "boxSizing", !1, o);
    if (0 >= r || null == r) {
      if (r = ee(t, e, o),
      (0 > r || null == r) && (r = t.style[e]),
      ie.test(r))
        return r;
      i = s && (nt.boxSizingReliable() || r === t.style[e]),
      r = parseFloat(r) || 0
    }
    return r + O(t, e, n || (s ? "border" : "content"), i, o) + "px"
  }
  function N(t, e, n, i, r) {
    return new N.prototype.init(t,e,n,i,r)
  }
  function j() {
    return setTimeout(function() {
      fe = void 0
    }),
    fe = rt.now()
  }
  function M(t, e) {
    var n, i = {
      height: t
    }, r = 0;
    for (e = e ? 1 : 0; 4 > r; r += 2 - e)
      n = St[r],
      i["margin" + n] = i["padding" + n] = t;
    return e && (i.opacity = i.width = t),
    i
  }
  function L(t, e, n) {
    for (var i, r = (be[e] || []).concat(be["*"]), o = 0, s = r.length; s > o; o++)
      if (i = r[o].call(n, e, t))
        return i
  }
  function P(t, e, n) {
    var i, r, o, s, a, l, u, c, h = this, d = {}, f = t.style, p = t.nodeType && Dt(t), m = rt._data(t, "fxshow");
    n.queue || (a = rt._queueHooks(t, "fx"),
    null == a.unqueued && (a.unqueued = 0,
    l = a.empty.fire,
    a.empty.fire = function() {
      a.unqueued || l()
    }
    ),
    a.unqueued++,
    h.always(function() {
      h.always(function() {
        a.unqueued--,
        rt.queue(t, "fx").length || a.empty.fire()
      })
    })),
    1 === t.nodeType && ("height"in e || "width"in e) && (n.overflow = [f.overflow, f.overflowX, f.overflowY],
    u = rt.css(t, "display"),
    c = "none" === u ? rt._data(t, "olddisplay") || T(t.nodeName) : u,
    "inline" === c && "none" === rt.css(t, "float") && (nt.inlineBlockNeedsLayout && "inline" !== T(t.nodeName) ? f.zoom = 1 : f.display = "inline-block")),
    n.overflow && (f.overflow = "hidden",
    nt.shrinkWrapBlocks() || h.always(function() {
      f.overflow = n.overflow[0],
      f.overflowX = n.overflow[1],
      f.overflowY = n.overflow[2]
    }));
    for (i in e)
      if (r = e[i],
      me.exec(r)) {
        if (delete e[i],
        o = o || "toggle" === r,
        r === (p ? "hide" : "show")) {
          if ("show" !== r || !m || void 0 === m[i])
            continue;
          p = !0
        }
        d[i] = m && m[i] || rt.style(t, i)
      } else
        u = void 0;
    if (rt.isEmptyObject(d))
      "inline" === ("none" === u ? T(t.nodeName) : u) && (f.display = u);
    else {
      m ? "hidden"in m && (p = m.hidden) : m = rt._data(t, "fxshow", {}),
      o && (m.hidden = !p),
      p ? rt(t).show() : h.done(function() {
        rt(t).hide()
      }),
      h.done(function() {
        var e;
        rt._removeData(t, "fxshow");
        for (e in d)
          rt.style(t, e, d[e])
      });
      for (i in d)
        s = L(p ? m[i] : 0, i, h),
        i in m || (m[i] = s.start,
        p && (s.end = s.start,
        s.start = "width" === i || "height" === i ? 1 : 0))
    }
  }
  function F(t, e) {
    var n, i, r, o, s;
    for (n in t)
      if (i = rt.camelCase(n),
      r = e[i],
      o = t[n],
      rt.isArray(o) && (r = o[1],
      o = t[n] = o[0]),
      n !== i && (t[i] = o,
      delete t[n]),
      s = rt.cssHooks[i],
      s && "expand"in s) {
        o = s.expand(o),
        delete t[i];
        for (n in o)
          n in t || (t[n] = o[n],
          e[n] = r)
      } else
        e[i] = r
  }
  function I(t, e, n) {
    var i, r, o = 0, s = ye.length, a = rt.Deferred().always(function() {
      delete l.elem
    }), l = function() {
      if (r)
        return !1;
      for (var e = fe || j(), n = Math.max(0, u.startTime + u.duration - e), i = n / u.duration || 0, o = 1 - i, s = 0, l = u.tweens.length; l > s; s++)
        u.tweens[s].run(o);
      return a.notifyWith(t, [u, o, n]),
      1 > o && l ? n : (a.resolveWith(t, [u]),
      !1)
    }, u = a.promise({
      elem: t,
      props: rt.extend({}, e),
      opts: rt.extend(!0, {
        specialEasing: {}
      }, n),
      originalProperties: e,
      originalOptions: n,
      startTime: fe || j(),
      duration: n.duration,
      tweens: [],
      createTween: function(e, n) {
        var i = rt.Tween(t, u.opts, e, n, u.opts.specialEasing[e] || u.opts.easing);
        return u.tweens.push(i),
        i
      },
      stop: function(e) {
        var n = 0
          , i = e ? u.tweens.length : 0;
        if (r)
          return this;
        for (r = !0; i > n; n++)
          u.tweens[n].run(1);
        return e ? a.resolveWith(t, [u, e]) : a.rejectWith(t, [u, e]),
        this
      }
    }), c = u.props;
    for (F(c, u.opts.specialEasing); s > o; o++)
      if (i = ye[o].call(u, t, c, u.opts))
        return i;
    return rt.map(c, L, u),
    rt.isFunction(u.opts.start) && u.opts.start.call(t, u),
    rt.fx.timer(rt.extend(l, {
      elem: t,
      anim: u,
      queue: u.opts.queue
    })),
    u.progress(u.opts.progress).done(u.opts.done, u.opts.complete).fail(u.opts.fail).always(u.opts.always)
  }
  function H(t) {
    return function(e, n) {
      "string" != typeof e && (n = e,
      e = "*");
      var i, r = 0, o = e.toLowerCase().match(bt) || [];
      if (rt.isFunction(n))
        for (; i = o[r++]; )
          "+" === i.charAt(0) ? (i = i.slice(1) || "*",
          (t[i] = t[i] || []).unshift(n)) : (t[i] = t[i] || []).push(n)
    }
  }
  function R(t, e, n, i) {
    function r(a) {
      var l;
      return o[a] = !0,
      rt.each(t[a] || [], function(t, a) {
        var u = a(e, n, i);
        return "string" != typeof u || s || o[u] ? s ? !(l = u) : void 0 : (e.dataTypes.unshift(u),
        r(u),
        !1)
      }),
      l
    }
    var o = {}
      , s = t === qe;
    return r(e.dataTypes[0]) || !o["*"] && r("*")
  }
  function W(t, e) {
    var n, i, r = rt.ajaxSettings.flatOptions || {};
    for (i in e)
      void 0 !== e[i] && ((r[i] ? t : n || (n = {}))[i] = e[i]);
    return n && rt.extend(!0, t, n),
    t
  }
  function Y(t, e, n) {
    for (var i, r, o, s, a = t.contents, l = t.dataTypes; "*" === l[0]; )
      l.shift(),
      void 0 === r && (r = t.mimeType || e.getResponseHeader("Content-Type"));
    if (r)
      for (s in a)
        if (a[s] && a[s].test(r)) {
          l.unshift(s);
          break
        }
    if (l[0]in n)
      o = l[0];
    else {
      for (s in n) {
        if (!l[0] || t.converters[s + " " + l[0]]) {
          o = s;
          break
        }
        i || (i = s)
      }
      o = o || i
    }
    return o ? (o !== l[0] && l.unshift(o),
    n[o]) : void 0
  }
  function q(t, e, n, i) {
    var r, o, s, a, l, u = {}, c = t.dataTypes.slice();
    if (c[1])
      for (s in t.converters)
        u[s.toLowerCase()] = t.converters[s];
    for (o = c.shift(); o; )
      if (t.responseFields[o] && (n[t.responseFields[o]] = e),
      !l && i && t.dataFilter && (e = t.dataFilter(e, t.dataType)),
      l = o,
      o = c.shift())
        if ("*" === o)
          o = l;
        else if ("*" !== l && l !== o) {
          if (s = u[l + " " + o] || u["* " + o],
          !s)
            for (r in u)
              if (a = r.split(" "),
              a[1] === o && (s = u[l + " " + a[0]] || u["* " + a[0]])) {
                s === !0 ? s = u[r] : u[r] !== !0 && (o = a[0],
                c.unshift(a[1]));
                break
              }
          if (s !== !0)
            if (s && t["throws"])
              e = s(e);
            else
              try {
                e = s(e)
              } catch (h) {
                return {
                  state: "parsererror",
                  error: s ? h : "No conversion from " + l + " to " + o
                }
              }
        }
    return {
      state: "success",
      data: e
    }
  }
  function U(t, e, n, i) {
    var r;
    if (rt.isArray(e))
      rt.each(e, function(e, r) {
        n || ze.test(t) ? i(t, r) : U(t + "[" + ("object" == typeof r ? e : "") + "]", r, n, i)
      });
    else if (n || "object" !== rt.type(e))
      i(t, e);
    else
      for (r in e)
        U(t + "[" + r + "]", e[r], n, i)
  }
  function B() {
    try {
      return new t.XMLHttpRequest
    } catch (e) {}
  }
  function V() {
    try {
      return new t.ActiveXObject("Microsoft.XMLHTTP")
    } catch (e) {}
  }
  function z(t) {
    return rt.isWindow(t) ? t : 9 === t.nodeType ? t.defaultView || t.parentWindow : !1
  }
  var G = []
    , X = G.slice
    , J = G.concat
    , Q = G.push
    , Z = G.indexOf
    , K = {}
    , tt = K.toString
    , et = K.hasOwnProperty
    , nt = {}
    , it = "1.11.3"
    , rt = function(t, e) {
    return new rt.fn.init(t,e)
  }
    , ot = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g
    , st = /^-ms-/
    , at = /-([\da-z])/gi
    , lt = function(t, e) {
    return e.toUpperCase()
  };
  rt.fn = rt.prototype = {
    jquery: it,
    constructor: rt,
    selector: "",
    length: 0,
    toArray: function() {
      return X.call(this)
    },
    get: function(t) {
      return null != t ? 0 > t ? this[t + this.length] : this[t] : X.call(this)
    },
    pushStack: function(t) {
      var e = rt.merge(this.constructor(), t);
      return e.prevObject = this,
      e.context = this.context,
      e
    },
    each: function(t, e) {
      return rt.each(this, t, e)
    },
    map: function(t) {
      return this.pushStack(rt.map(this, function(e, n) {
        return t.call(e, n, e)
      }))
    },
    slice: function() {
      return this.pushStack(X.apply(this, arguments))
    },
    first: function() {
      return this.eq(0)
    },
    last: function() {
      return this.eq(-1)
    },
    eq: function(t) {
      var e = this.length
        , n = +t + (0 > t ? e : 0);
      return this.pushStack(n >= 0 && e > n ? [this[n]] : [])
    },
    end: function() {
      return this.prevObject || this.constructor(null)
    },
    push: Q,
    sort: G.sort,
    splice: G.splice
  },
  rt.extend = rt.fn.extend = function() {
    var t, e, n, i, r, o, s = arguments[0] || {}, a = 1, l = arguments.length, u = !1;
    for ("boolean" == typeof s && (u = s,
    s = arguments[a] || {},
    a++),
    "object" == typeof s || rt.isFunction(s) || (s = {}),
    a === l && (s = this,
    a--); l > a; a++)
      if (null != (r = arguments[a]))
        for (i in r)
          t = s[i],
          n = r[i],
          s !== n && (u && n && (rt.isPlainObject(n) || (e = rt.isArray(n))) ? (e ? (e = !1,
          o = t && rt.isArray(t) ? t : []) : o = t && rt.isPlainObject(t) ? t : {},
          s[i] = rt.extend(u, o, n)) : void 0 !== n && (s[i] = n));
    return s
  }
  ,
  rt.extend({
    expando: "jQuery" + (it + Math.random()).replace(/\D/g, ""),
    isReady: !0,
    error: function(t) {
      throw new Error(t)
    },
    noop: function() {},
    isFunction: function(t) {
      return "function" === rt.type(t)
    },
    isArray: Array.isArray || function(t) {
      return "array" === rt.type(t)
    }
    ,
    isWindow: function(t) {
      return null != t && t == t.window
    },
    isNumeric: function(t) {
      return !rt.isArray(t) && t - parseFloat(t) + 1 >= 0
    },
    isEmptyObject: function(t) {
      var e;
      for (e in t)
        return !1;
      return !0
    },
    isPlainObject: function(t) {
      var e;
      if (!t || "object" !== rt.type(t) || t.nodeType || rt.isWindow(t))
        return !1;
      try {
        if (t.constructor && !et.call(t, "constructor") && !et.call(t.constructor.prototype, "isPrototypeOf"))
          return !1
      } catch (n) {
        return !1
      }
      if (nt.ownLast)
        for (e in t)
          return et.call(t, e);
      for (e in t)
        ;
      return void 0 === e || et.call(t, e)
    },
    type: function(t) {
      return null == t ? t + "" : "object" == typeof t || "function" == typeof t ? K[tt.call(t)] || "object" : typeof t
    },
    globalEval: function(e) {
      e && rt.trim(e) && (t.execScript || function(e) {
        t.eval.call(t, e)
      }
      )(e)
    },
    camelCase: function(t) {
      return t.replace(st, "ms-").replace(at, lt)
    },
    nodeName: function(t, e) {
      return t.nodeName && t.nodeName.toLowerCase() === e.toLowerCase()
    },
    each: function(t, e, i) {
      var r, o = 0, s = t.length, a = n(t);
      if (i) {
        if (a)
          for (; s > o && (r = e.apply(t[o], i),
          r !== !1); o++)
            ;
        else
          for (o in t)
            if (r = e.apply(t[o], i),
            r === !1)
              break
      } else if (a)
        for (; s > o && (r = e.call(t[o], o, t[o]),
        r !== !1); o++)
          ;
      else
        for (o in t)
          if (r = e.call(t[o], o, t[o]),
          r === !1)
            break;
      return t
    },
    trim: function(t) {
      return null == t ? "" : (t + "").replace(ot, "")
    },
    makeArray: function(t, e) {
      var i = e || [];
      return null != t && (n(Object(t)) ? rt.merge(i, "string" == typeof t ? [t] : t) : Q.call(i, t)),
      i
    },
    inArray: function(t, e, n) {
      var i;
      if (e) {
        if (Z)
          return Z.call(e, t, n);
        for (i = e.length,
        n = n ? 0 > n ? Math.max(0, i + n) : n : 0; i > n; n++)
          if (n in e && e[n] === t)
            return n
      }
      return -1
    },
    merge: function(t, e) {
      for (var n = +e.length, i = 0, r = t.length; n > i; )
        t[r++] = e[i++];
      if (n !== n)
        for (; void 0 !== e[i]; )
          t[r++] = e[i++];
      return t.length = r,
      t
    },
    grep: function(t, e, n) {
      for (var i, r = [], o = 0, s = t.length, a = !n; s > o; o++)
        i = !e(t[o], o),
        i !== a && r.push(t[o]);
      return r
    },
    map: function(t, e, i) {
      var r, o = 0, s = t.length, a = n(t), l = [];
      if (a)
        for (; s > o; o++)
          r = e(t[o], o, i),
          null != r && l.push(r);
      else
        for (o in t)
          r = e(t[o], o, i),
          null != r && l.push(r);
      return J.apply([], l)
    },
    guid: 1,
    proxy: function(t, e) {
      var n, i, r;
      return "string" == typeof e && (r = t[e],
      e = t,
      t = r),
      rt.isFunction(t) ? (n = X.call(arguments, 2),
      i = function() {
        return t.apply(e || this, n.concat(X.call(arguments)))
      }
      ,
      i.guid = t.guid = t.guid || rt.guid++,
      i) : void 0
    },
    now: function() {
      return +new Date
    },
    support: nt
  }),
  rt.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(t, e) {
    K["[object " + e + "]"] = e.toLowerCase()
  });
  var ut = function(t) {
    function e(t, e, n, i) {
      var r, o, s, a, l, u, h, f, p, m;
      if ((e ? e.ownerDocument || e : R) !== N && A(e),
      e = e || N,
      n = n || [],
      a = e.nodeType,
      "string" != typeof t || !t || 1 !== a && 9 !== a && 11 !== a)
        return n;
      if (!i && M) {
        if (11 !== a && (r = yt.exec(t)))
          if (s = r[1]) {
            if (9 === a) {
              if (o = e.getElementById(s),
              !o || !o.parentNode)
                return n;
              if (o.id === s)
                return n.push(o),
                n
            } else if (e.ownerDocument && (o = e.ownerDocument.getElementById(s)) && I(e, o) && o.id === s)
              return n.push(o),
              n
          } else {
            if (r[2])
              return Z.apply(n, e.getElementsByTagName(t)),
              n;
            if ((s = r[3]) && w.getElementsByClassName)
              return Z.apply(n, e.getElementsByClassName(s)),
              n
          }
        if (w.qsa && (!L || !L.test(t))) {
          if (f = h = H,
          p = e,
          m = 1 !== a && t,
          1 === a && "object" !== e.nodeName.toLowerCase()) {
            for (u = T(t),
            (h = e.getAttribute("id")) ? f = h.replace(_t, "\\$&") : e.setAttribute("id", f),
            f = "[id='" + f + "'] ",
            l = u.length; l--; )
              u[l] = f + d(u[l]);
            p = bt.test(t) && c(e.parentNode) || e,
            m = u.join(",")
          }
          if (m)
            try {
              return Z.apply(n, p.querySelectorAll(m)),
              n
            } catch (g) {} finally {
              h || e.removeAttribute("id")
            }
        }
      }
      return S(t.replace(lt, "$1"), e, n, i)
    }
    function n() {
      function t(n, i) {
        return e.push(n + " ") > x.cacheLength && delete t[e.shift()],
        t[n + " "] = i
      }
      var e = [];
      return t
    }
    function i(t) {
      return t[H] = !0,
      t
    }
    function r(t) {
      var e = N.createElement("div");
      try {
        return !!t(e)
      } catch (n) {
        return !1
      } finally {
        e.parentNode && e.parentNode.removeChild(e),
        e = null
      }
    }
    function o(t, e) {
      for (var n = t.split("|"), i = t.length; i--; )
        x.attrHandle[n[i]] = e
    }
    function s(t, e) {
      var n = e && t
        , i = n && 1 === t.nodeType && 1 === e.nodeType && (~e.sourceIndex || z) - (~t.sourceIndex || z);
      if (i)
        return i;
      if (n)
        for (; n = n.nextSibling; )
          if (n === e)
            return -1;
      return t ? 1 : -1
    }
    function a(t) {
      return function(e) {
        var n = e.nodeName.toLowerCase();
        return "input" === n && e.type === t
      }
    }
    function l(t) {
      return function(e) {
        var n = e.nodeName.toLowerCase();
        return ("input" === n || "button" === n) && e.type === t
      }
    }
    function u(t) {
      return i(function(e) {
        return e = +e,
        i(function(n, i) {
          for (var r, o = t([], n.length, e), s = o.length; s--; )
            n[r = o[s]] && (n[r] = !(i[r] = n[r]))
        })
      })
    }
    function c(t) {
      return t && "undefined" != typeof t.getElementsByTagName && t
    }
    function h() {}
    function d(t) {
      for (var e = 0, n = t.length, i = ""; n > e; e++)
        i += t[e].value;
      return i
    }
    function f(t, e, n) {
      var i = e.dir
        , r = n && "parentNode" === i
        , o = Y++;
      return e.first ? function(e, n, o) {
        for (; e = e[i]; )
          if (1 === e.nodeType || r)
            return t(e, n, o)
      }
      : function(e, n, s) {
        var a, l, u = [W, o];
        if (s) {
          for (; e = e[i]; )
            if ((1 === e.nodeType || r) && t(e, n, s))
              return !0
        } else
          for (; e = e[i]; )
            if (1 === e.nodeType || r) {
              if (l = e[H] || (e[H] = {}),
              (a = l[i]) && a[0] === W && a[1] === o)
                return u[2] = a[2];
              if (l[i] = u,
              u[2] = t(e, n, s))
                return !0
            }
      }
    }
    function p(t) {
      return t.length > 1 ? function(e, n, i) {
        for (var r = t.length; r--; )
          if (!t[r](e, n, i))
            return !1;
        return !0
      }
      : t[0]
    }
    function m(t, n, i) {
      for (var r = 0, o = n.length; o > r; r++)
        e(t, n[r], i);
      return i
    }
    function g(t, e, n, i, r) {
      for (var o, s = [], a = 0, l = t.length, u = null != e; l > a; a++)
        (o = t[a]) && (!n || n(o, i, r)) && (s.push(o),
        u && e.push(a));
      return s
    }
    function v(t, e, n, r, o, s) {
      return r && !r[H] && (r = v(r)),
      o && !o[H] && (o = v(o, s)),
      i(function(i, s, a, l) {
        var u, c, h, d = [], f = [], p = s.length, v = i || m(e || "*", a.nodeType ? [a] : a, []), y = !t || !i && e ? v : g(v, d, t, a, l), b = n ? o || (i ? t : p || r) ? [] : s : y;
        if (n && n(y, b, a, l),
        r)
          for (u = g(b, f),
          r(u, [], a, l),
          c = u.length; c--; )
            (h = u[c]) && (b[f[c]] = !(y[f[c]] = h));
        if (i) {
          if (o || t) {
            if (o) {
              for (u = [],
              c = b.length; c--; )
                (h = b[c]) && u.push(y[c] = h);
              o(null, b = [], u, l)
            }
            for (c = b.length; c--; )
              (h = b[c]) && (u = o ? tt(i, h) : d[c]) > -1 && (i[u] = !(s[u] = h))
          }
        } else
          b = g(b === s ? b.splice(p, b.length) : b),
          o ? o(null, s, b, l) : Z.apply(s, b)
      })
    }
    function y(t) {
      for (var e, n, i, r = t.length, o = x.relative[t[0].type], s = o || x.relative[" "], a = o ? 1 : 0, l = f(function(t) {
        return t === e
      }, s, !0), u = f(function(t) {
        return tt(e, t) > -1
      }, s, !0), c = [function(t, n, i) {
        var r = !o && (i || n !== D) || ((e = n).nodeType ? l(t, n, i) : u(t, n, i));
        return e = null,
        r
      }
      ]; r > a; a++)
        if (n = x.relative[t[a].type])
          c = [f(p(c), n)];
        else {
          if (n = x.filter[t[a].type].apply(null, t[a].matches),
          n[H]) {
            for (i = ++a; r > i && !x.relative[t[i].type]; i++)
              ;
            return v(a > 1 && p(c), a > 1 && d(t.slice(0, a - 1).concat({
              value: " " === t[a - 2].type ? "*" : ""
            })).replace(lt, "$1"), n, i > a && y(t.slice(a, i)), r > i && y(t = t.slice(i)), r > i && d(t))
          }
          c.push(n)
        }
      return p(c)
    }
    function b(t, n) {
      var r = n.length > 0
        , o = t.length > 0
        , s = function(i, s, a, l, u) {
        var c, h, d, f = 0, p = "0", m = i && [], v = [], y = D, b = i || o && x.find.TAG("*", u), _ = W += null == y ? 1 : Math.random() || .1, w = b.length;
        for (u && (D = s !== N && s); p !== w && null != (c = b[p]); p++) {
          if (o && c) {
            for (h = 0; d = t[h++]; )
              if (d(c, s, a)) {
                l.push(c);
                break
              }
            u && (W = _)
          }
          r && ((c = !d && c) && f--,
          i && m.push(c))
        }
        if (f += p,
        r && p !== f) {
          for (h = 0; d = n[h++]; )
            d(m, v, s, a);
          if (i) {
            if (f > 0)
              for (; p--; )
                m[p] || v[p] || (v[p] = J.call(l));
            v = g(v)
          }
          Z.apply(l, v),
          u && !i && v.length > 0 && f + n.length > 1 && e.uniqueSort(l)
        }
        return u && (W = _,
        D = y),
        m
      };
      return r ? i(s) : s
    }
    var _, w, x, k, C, T, $, S, D, E, O, A, N, j, M, L, P, F, I, H = "sizzle" + 1 * new Date, R = t.document, W = 0, Y = 0, q = n(), U = n(), B = n(), V = function(t, e) {
      return t === e && (O = !0),
      0
    }, z = 1 << 31, G = {}.hasOwnProperty, X = [], J = X.pop, Q = X.push, Z = X.push, K = X.slice, tt = function(t, e) {
      for (var n = 0, i = t.length; i > n; n++)
        if (t[n] === e)
          return n;
      return -1
    }, et = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped", nt = "[\\x20\\t\\r\\n\\f]", it = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+", rt = it.replace("w", "w#"), ot = "\\[" + nt + "*(" + it + ")(?:" + nt + "*([*^$|!~]?=)" + nt + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + rt + "))|)" + nt + "*\\]", st = ":(" + it + ")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|" + ot + ")*)|.*)\\)|)", at = new RegExp(nt + "+","g"), lt = new RegExp("^" + nt + "+|((?:^|[^\\\\])(?:\\\\.)*)" + nt + "+$","g"), ut = new RegExp("^" + nt + "*," + nt + "*"), ct = new RegExp("^" + nt + "*([>+~]|" + nt + ")" + nt + "*"), ht = new RegExp("=" + nt + "*([^\\]'\"]*?)" + nt + "*\\]","g"), dt = new RegExp(st), ft = new RegExp("^" + rt + "$"), pt = {
      ID: new RegExp("^#(" + it + ")"),
      CLASS: new RegExp("^\\.(" + it + ")"),
      TAG: new RegExp("^(" + it.replace("w", "w*") + ")"),
      ATTR: new RegExp("^" + ot),
      PSEUDO: new RegExp("^" + st),
      CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + nt + "*(even|odd|(([+-]|)(\\d*)n|)" + nt + "*(?:([+-]|)" + nt + "*(\\d+)|))" + nt + "*\\)|)","i"),
      bool: new RegExp("^(?:" + et + ")$","i"),
      needsContext: new RegExp("^" + nt + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + nt + "*((?:-\\d)?\\d*)" + nt + "*\\)|)(?=[^-]|$)","i")
    }, mt = /^(?:input|select|textarea|button)$/i, gt = /^h\d$/i, vt = /^[^{]+\{\s*\[native \w/, yt = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/, bt = /[+~]/, _t = /'|\\/g, wt = new RegExp("\\\\([\\da-f]{1,6}" + nt + "?|(" + nt + ")|.)","ig"), xt = function(t, e, n) {
      var i = "0x" + e - 65536;
      return i !== i || n ? e : 0 > i ? String.fromCharCode(i + 65536) : String.fromCharCode(i >> 10 | 55296, 1023 & i | 56320)
    }, kt = function() {
      A()
    };
    try {
      Z.apply(X = K.call(R.childNodes), R.childNodes),
      X[R.childNodes.length].nodeType
    } catch (Ct) {
      Z = {
        apply: X.length ? function(t, e) {
          Q.apply(t, K.call(e))
        }
        : function(t, e) {
          for (var n = t.length, i = 0; t[n++] = e[i++]; )
            ;
          t.length = n - 1
        }
      }
    }
    w = e.support = {},
    C = e.isXML = function(t) {
      var e = t && (t.ownerDocument || t).documentElement;
      return e ? "HTML" !== e.nodeName : !1
    }
    ,
    A = e.setDocument = function(t) {
      var e, n, i = t ? t.ownerDocument || t : R;
      return i !== N && 9 === i.nodeType && i.documentElement ? (N = i,
      j = i.documentElement,
      n = i.defaultView,
      n && n !== n.top && (n.addEventListener ? n.addEventListener("unload", kt, !1) : n.attachEvent && n.attachEvent("onunload", kt)),
      M = !C(i),
      w.attributes = r(function(t) {
        return t.className = "i",
        !t.getAttribute("className")
      }),
      w.getElementsByTagName = r(function(t) {
        return t.appendChild(i.createComment("")),
        !t.getElementsByTagName("*").length
      }),
      w.getElementsByClassName = vt.test(i.getElementsByClassName),
      w.getById = r(function(t) {
        return j.appendChild(t).id = H,
        !i.getElementsByName || !i.getElementsByName(H).length
      }),
      w.getById ? (x.find.ID = function(t, e) {
        if ("undefined" != typeof e.getElementById && M) {
          var n = e.getElementById(t);
          return n && n.parentNode ? [n] : []
        }
      }
      ,
      x.filter.ID = function(t) {
        var e = t.replace(wt, xt);
        return function(t) {
          return t.getAttribute("id") === e
        }
      }
      ) : (delete x.find.ID,
      x.filter.ID = function(t) {
        var e = t.replace(wt, xt);
        return function(t) {
          var n = "undefined" != typeof t.getAttributeNode && t.getAttributeNode("id");
          return n && n.value === e
        }
      }
      ),
      x.find.TAG = w.getElementsByTagName ? function(t, e) {
        return "undefined" != typeof e.getElementsByTagName ? e.getElementsByTagName(t) : w.qsa ? e.querySelectorAll(t) : void 0
      }
      : function(t, e) {
        var n, i = [], r = 0, o = e.getElementsByTagName(t);
        if ("*" === t) {
          for (; n = o[r++]; )
            1 === n.nodeType && i.push(n);
          return i
        }
        return o
      }
      ,
      x.find.CLASS = w.getElementsByClassName && function(t, e) {
        return M ? e.getElementsByClassName(t) : void 0
      }
      ,
      P = [],
      L = [],
      (w.qsa = vt.test(i.querySelectorAll)) && (r(function(t) {
        j.appendChild(t).innerHTML = "<a id='" + H + "'></a><select id='" + H + "-\f]' msallowcapture=''><option selected=''></option></select>",
        t.querySelectorAll("[msallowcapture^='']").length && L.push("[*^$]=" + nt + "*(?:''|\"\")"),
        t.querySelectorAll("[selected]").length || L.push("\\[" + nt + "*(?:value|" + et + ")"),
        t.querySelectorAll("[id~=" + H + "-]").length || L.push("~="),
        t.querySelectorAll(":checked").length || L.push(":checked"),
        t.querySelectorAll("a#" + H + "+*").length || L.push(".#.+[+~]")
      }),
      r(function(t) {
        var e = i.createElement("input");
        e.setAttribute("type", "hidden"),
        t.appendChild(e).setAttribute("name", "D"),
        t.querySelectorAll("[name=d]").length && L.push("name" + nt + "*[*^$|!~]?="),
        t.querySelectorAll(":enabled").length || L.push(":enabled", ":disabled"),
        t.querySelectorAll("*,:x"),
        L.push(",.*:")
      })),
      (w.matchesSelector = vt.test(F = j.matches || j.webkitMatchesSelector || j.mozMatchesSelector || j.oMatchesSelector || j.msMatchesSelector)) && r(function(t) {
        w.disconnectedMatch = F.call(t, "div"),
        F.call(t, "[s!='']:x"),
        P.push("!=", st)
      }),
      L = L.length && new RegExp(L.join("|")),
      P = P.length && new RegExp(P.join("|")),
      e = vt.test(j.compareDocumentPosition),
      I = e || vt.test(j.contains) ? function(t, e) {
        var n = 9 === t.nodeType ? t.documentElement : t
          , i = e && e.parentNode;
        return t === i || !(!i || 1 !== i.nodeType || !(n.contains ? n.contains(i) : t.compareDocumentPosition && 16 & t.compareDocumentPosition(i)))
      }
      : function(t, e) {
        if (e)
          for (; e = e.parentNode; )
            if (e === t)
              return !0;
        return !1
      }
      ,
      V = e ? function(t, e) {
        if (t === e)
          return O = !0,
          0;
        var n = !t.compareDocumentPosition - !e.compareDocumentPosition;
        return n ? n : (n = (t.ownerDocument || t) === (e.ownerDocument || e) ? t.compareDocumentPosition(e) : 1,
        1 & n || !w.sortDetached && e.compareDocumentPosition(t) === n ? t === i || t.ownerDocument === R && I(R, t) ? -1 : e === i || e.ownerDocument === R && I(R, e) ? 1 : E ? tt(E, t) - tt(E, e) : 0 : 4 & n ? -1 : 1)
      }
      : function(t, e) {
        if (t === e)
          return O = !0,
          0;
        var n, r = 0, o = t.parentNode, a = e.parentNode, l = [t], u = [e];
        if (!o || !a)
          return t === i ? -1 : e === i ? 1 : o ? -1 : a ? 1 : E ? tt(E, t) - tt(E, e) : 0;
        if (o === a)
          return s(t, e);
        for (n = t; n = n.parentNode; )
          l.unshift(n);
        for (n = e; n = n.parentNode; )
          u.unshift(n);
        for (; l[r] === u[r]; )
          r++;
        return r ? s(l[r], u[r]) : l[r] === R ? -1 : u[r] === R ? 1 : 0
      }
      ,
      i) : N
    }
    ,
    e.matches = function(t, n) {
      return e(t, null, null, n)
    }
    ,
    e.matchesSelector = function(t, n) {
      if ((t.ownerDocument || t) !== N && A(t),
      n = n.replace(ht, "='$1']"),
      !(!w.matchesSelector || !M || P && P.test(n) || L && L.test(n)))
        try {
          var i = F.call(t, n);
          if (i || w.disconnectedMatch || t.document && 11 !== t.document.nodeType)
            return i
        } catch (r) {}
      return e(n, N, null, [t]).length > 0
    }
    ,
    e.contains = function(t, e) {
      return (t.ownerDocument || t) !== N && A(t),
      I(t, e)
    }
    ,
    e.attr = function(t, e) {
      (t.ownerDocument || t) !== N && A(t);
      var n = x.attrHandle[e.toLowerCase()]
        , i = n && G.call(x.attrHandle, e.toLowerCase()) ? n(t, e, !M) : void 0;
      return void 0 !== i ? i : w.attributes || !M ? t.getAttribute(e) : (i = t.getAttributeNode(e)) && i.specified ? i.value : null
    }
    ,
    e.error = function(t) {
      throw new Error("Syntax error, unrecognized expression: " + t)
    }
    ,
    e.uniqueSort = function(t) {
      var e, n = [], i = 0, r = 0;
      if (O = !w.detectDuplicates,
      E = !w.sortStable && t.slice(0),
      t.sort(V),
      O) {
        for (; e = t[r++]; )
          e === t[r] && (i = n.push(r));
        for (; i--; )
          t.splice(n[i], 1)
      }
      return E = null,
      t
    }
    ,
    k = e.getText = function(t) {
      var e, n = "", i = 0, r = t.nodeType;
      if (r) {
        if (1 === r || 9 === r || 11 === r) {
          if ("string" == typeof t.textContent)
            return t.textContent;
          for (t = t.firstChild; t; t = t.nextSibling)
            n += k(t)
        } else if (3 === r || 4 === r)
          return t.nodeValue
      } else
        for (; e = t[i++]; )
          n += k(e);
      return n
    }
    ,
    x = e.selectors = {
      cacheLength: 50,
      createPseudo: i,
      match: pt,
      attrHandle: {},
      find: {},
      relative: {
        ">": {
          dir: "parentNode",
          first: !0
        },
        " ": {
          dir: "parentNode"
        },
        "+": {
          dir: "previousSibling",
          first: !0
        },
        "~": {
          dir: "previousSibling"
        }
      },
      preFilter: {
        ATTR: function(t) {
          return t[1] = t[1].replace(wt, xt),
          t[3] = (t[3] || t[4] || t[5] || "").replace(wt, xt),
          "~=" === t[2] && (t[3] = " " + t[3] + " "),
          t.slice(0, 4)
        },
        CHILD: function(t) {
          return t[1] = t[1].toLowerCase(),
          "nth" === t[1].slice(0, 3) ? (t[3] || e.error(t[0]),
          t[4] = +(t[4] ? t[5] + (t[6] || 1) : 2 * ("even" === t[3] || "odd" === t[3])),
          t[5] = +(t[7] + t[8] || "odd" === t[3])) : t[3] && e.error(t[0]),
          t
        },
        PSEUDO: function(t) {
          var e, n = !t[6] && t[2];
          return pt.CHILD.test(t[0]) ? null : (t[3] ? t[2] = t[4] || t[5] || "" : n && dt.test(n) && (e = T(n, !0)) && (e = n.indexOf(")", n.length - e) - n.length) && (t[0] = t[0].slice(0, e),
          t[2] = n.slice(0, e)),
          t.slice(0, 3))
        }
      },
      filter: {
        TAG: function(t) {
          var e = t.replace(wt, xt).toLowerCase();
          return "*" === t ? function() {
            return !0
          }
          : function(t) {
            return t.nodeName && t.nodeName.toLowerCase() === e
          }
        },
        CLASS: function(t) {
          var e = q[t + " "];
          return e || (e = new RegExp("(^|" + nt + ")" + t + "(" + nt + "|$)")) && q(t, function(t) {
            return e.test("string" == typeof t.className && t.className || "undefined" != typeof t.getAttribute && t.getAttribute("class") || "")
          })
        },
        ATTR: function(t, n, i) {
          return function(r) {
            var o = e.attr(r, t);
            return null == o ? "!=" === n : n ? (o += "",
            "=" === n ? o === i : "!=" === n ? o !== i : "^=" === n ? i && 0 === o.indexOf(i) : "*=" === n ? i && o.indexOf(i) > -1 : "$=" === n ? i && o.slice(-i.length) === i : "~=" === n ? (" " + o.replace(at, " ") + " ").indexOf(i) > -1 : "|=" === n ? o === i || o.slice(0, i.length + 1) === i + "-" : !1) : !0
          }
        },
        CHILD: function(t, e, n, i, r) {
          var o = "nth" !== t.slice(0, 3)
            , s = "last" !== t.slice(-4)
            , a = "of-type" === e;
          return 1 === i && 0 === r ? function(t) {
            return !!t.parentNode
          }
          : function(e, n, l) {
            var u, c, h, d, f, p, m = o !== s ? "nextSibling" : "previousSibling", g = e.parentNode, v = a && e.nodeName.toLowerCase(), y = !l && !a;
            if (g) {
              if (o) {
                for (; m; ) {
                  for (h = e; h = h[m]; )
                    if (a ? h.nodeName.toLowerCase() === v : 1 === h.nodeType)
                      return !1;
                  p = m = "only" === t && !p && "nextSibling"
                }
                return !0
              }
              if (p = [s ? g.firstChild : g.lastChild],
              s && y) {
                for (c = g[H] || (g[H] = {}),
                u = c[t] || [],
                f = u[0] === W && u[1],
                d = u[0] === W && u[2],
                h = f && g.childNodes[f]; h = ++f && h && h[m] || (d = f = 0) || p.pop(); )
                  if (1 === h.nodeType && ++d && h === e) {
                    c[t] = [W, f, d];
                    break
                  }
              } else if (y && (u = (e[H] || (e[H] = {}))[t]) && u[0] === W)
                d = u[1];
              else
                for (; (h = ++f && h && h[m] || (d = f = 0) || p.pop()) && ((a ? h.nodeName.toLowerCase() !== v : 1 !== h.nodeType) || !++d || (y && ((h[H] || (h[H] = {}))[t] = [W, d]),
                h !== e)); )
                  ;
              return d -= r,
              d === i || d % i === 0 && d / i >= 0
            }
          }
        },
        PSEUDO: function(t, n) {
          var r, o = x.pseudos[t] || x.setFilters[t.toLowerCase()] || e.error("unsupported pseudo: " + t);
          return o[H] ? o(n) : o.length > 1 ? (r = [t, t, "", n],
          x.setFilters.hasOwnProperty(t.toLowerCase()) ? i(function(t, e) {
            for (var i, r = o(t, n), s = r.length; s--; )
              i = tt(t, r[s]),
              t[i] = !(e[i] = r[s])
          }) : function(t) {
            return o(t, 0, r)
          }
          ) : o
        }
      },
      pseudos: {
        not: i(function(t) {
          var e = []
            , n = []
            , r = $(t.replace(lt, "$1"));
          return r[H] ? i(function(t, e, n, i) {
            for (var o, s = r(t, null, i, []), a = t.length; a--; )
              (o = s[a]) && (t[a] = !(e[a] = o))
          }) : function(t, i, o) {
            return e[0] = t,
            r(e, null, o, n),
            e[0] = null,
            !n.pop()
          }
        }),
        has: i(function(t) {
          return function(n) {
            return e(t, n).length > 0
          }
        }),
        contains: i(function(t) {
          return t = t.replace(wt, xt),
          function(e) {
            return (e.textContent || e.innerText || k(e)).indexOf(t) > -1
          }
        }),
        lang: i(function(t) {
          return ft.test(t || "") || e.error("unsupported lang: " + t),
          t = t.replace(wt, xt).toLowerCase(),
          function(e) {
            var n;
            do
              if (n = M ? e.lang : e.getAttribute("xml:lang") || e.getAttribute("lang"))
                return n = n.toLowerCase(),
                n === t || 0 === n.indexOf(t + "-");
            while ((e = e.parentNode) && 1 === e.nodeType);return !1
          }
        }),
        target: function(e) {
          var n = t.location && t.location.hash;
          return n && n.slice(1) === e.id
        },
        root: function(t) {
          return t === j
        },
        focus: function(t) {
          return t === N.activeElement && (!N.hasFocus || N.hasFocus()) && !!(t.type || t.href || ~t.tabIndex)
        },
        enabled: function(t) {
          return t.disabled === !1
        },
        disabled: function(t) {
          return t.disabled === !0
        },
        checked: function(t) {
          var e = t.nodeName.toLowerCase();
          return "input" === e && !!t.checked || "option" === e && !!t.selected
        },
        selected: function(t) {
          return t.parentNode && t.parentNode.selectedIndex,
          t.selected === !0
        },
        empty: function(t) {
          for (t = t.firstChild; t; t = t.nextSibling)
            if (t.nodeType < 6)
              return !1;
          return !0
        },
        parent: function(t) {
          return !x.pseudos.empty(t)
        },
        header: function(t) {
          return gt.test(t.nodeName)
        },
        input: function(t) {
          return mt.test(t.nodeName)
        },
        button: function(t) {
          var e = t.nodeName.toLowerCase();
          return "input" === e && "button" === t.type || "button" === e
        },
        text: function(t) {
          var e;
          return "input" === t.nodeName.toLowerCase() && "text" === t.type && (null == (e = t.getAttribute("type")) || "text" === e.toLowerCase())
        },
        first: u(function() {
          return [0]
        }),
        last: u(function(t, e) {
          return [e - 1]
        }),
        eq: u(function(t, e, n) {
          return [0 > n ? n + e : n]
        }),
        even: u(function(t, e) {
          for (var n = 0; e > n; n += 2)
            t.push(n);
          return t
        }),
        odd: u(function(t, e) {
          for (var n = 1; e > n; n += 2)
            t.push(n);
          return t
        }),
        lt: u(function(t, e, n) {
          for (var i = 0 > n ? n + e : n; --i >= 0; )
            t.push(i);
          return t
        }),
        gt: u(function(t, e, n) {
          for (var i = 0 > n ? n + e : n; ++i < e; )
            t.push(i);
          return t
        })
      }
    },
    x.pseudos.nth = x.pseudos.eq;
    for (_ in {
      radio: !0,
      checkbox: !0,
      file: !0,
      password: !0,
      image: !0
    })
      x.pseudos[_] = a(_);
    for (_ in {
      submit: !0,
      reset: !0
    })
      x.pseudos[_] = l(_);
    return h.prototype = x.filters = x.pseudos,
    x.setFilters = new h,
    T = e.tokenize = function(t, n) {
      var i, r, o, s, a, l, u, c = U[t + " "];
      if (c)
        return n ? 0 : c.slice(0);
      for (a = t,
      l = [],
      u = x.preFilter; a; ) {
        (!i || (r = ut.exec(a))) && (r && (a = a.slice(r[0].length) || a),
        l.push(o = [])),
        i = !1,
        (r = ct.exec(a)) && (i = r.shift(),
        o.push({
          value: i,
          type: r[0].replace(lt, " ")
        }),
        a = a.slice(i.length));
        for (s in x.filter)
          !(r = pt[s].exec(a)) || u[s] && !(r = u[s](r)) || (i = r.shift(),
          o.push({
            value: i,
            type: s,
            matches: r
          }),
          a = a.slice(i.length));
        if (!i)
          break
      }
      return n ? a.length : a ? e.error(t) : U(t, l).slice(0)
    }
    ,
    $ = e.compile = function(t, e) {
      var n, i = [], r = [], o = B[t + " "];
      if (!o) {
        for (e || (e = T(t)),
        n = e.length; n--; )
          o = y(e[n]),
          o[H] ? i.push(o) : r.push(o);
        o = B(t, b(r, i)),
        o.selector = t
      }
      return o
    }
    ,
    S = e.select = function(t, e, n, i) {
      var r, o, s, a, l, u = "function" == typeof t && t, h = !i && T(t = u.selector || t);
      if (n = n || [],
      1 === h.length) {
        if (o = h[0] = h[0].slice(0),
        o.length > 2 && "ID" === (s = o[0]).type && w.getById && 9 === e.nodeType && M && x.relative[o[1].type]) {
          if (e = (x.find.ID(s.matches[0].replace(wt, xt), e) || [])[0],
          !e)
            return n;
          u && (e = e.parentNode),
          t = t.slice(o.shift().value.length)
        }
        for (r = pt.needsContext.test(t) ? 0 : o.length; r-- && (s = o[r],
        !x.relative[a = s.type]); )
          if ((l = x.find[a]) && (i = l(s.matches[0].replace(wt, xt), bt.test(o[0].type) && c(e.parentNode) || e))) {
            if (o.splice(r, 1),
            t = i.length && d(o),
            !t)
              return Z.apply(n, i),
              n;
            break
          }
      }
      return (u || $(t, h))(i, e, !M, n, bt.test(t) && c(e.parentNode) || e),
      n
    }
    ,
    w.sortStable = H.split("").sort(V).join("") === H,
    w.detectDuplicates = !!O,
    A(),
    w.sortDetached = r(function(t) {
      return 1 & t.compareDocumentPosition(N.createElement("div"))
    }),
    r(function(t) {
      return t.innerHTML = "<a href='#'></a>",
      "#" === t.firstChild.getAttribute("href")
    }) || o("type|href|height|width", function(t, e, n) {
      return n ? void 0 : t.getAttribute(e, "type" === e.toLowerCase() ? 1 : 2)
    }),
    w.attributes && r(function(t) {
      return t.innerHTML = "<input/>",
      t.firstChild.setAttribute("value", ""),
      "" === t.firstChild.getAttribute("value")
    }) || o("value", function(t, e, n) {
      return n || "input" !== t.nodeName.toLowerCase() ? void 0 : t.defaultValue
    }),
    r(function(t) {
      return null == t.getAttribute("disabled")
    }) || o(et, function(t, e, n) {
      var i;
      return n ? void 0 : t[e] === !0 ? e.toLowerCase() : (i = t.getAttributeNode(e)) && i.specified ? i.value : null
    }),
    e
  }(t);
  rt.find = ut,
  rt.expr = ut.selectors,
  rt.expr[":"] = rt.expr.pseudos,
  rt.unique = ut.uniqueSort,
  rt.text = ut.getText,
  rt.isXMLDoc = ut.isXML,
  rt.contains = ut.contains;
  var ct = rt.expr.match.needsContext
    , ht = /^<(\w+)\s*\/?>(?:<\/\1>|)$/
    , dt = /^.[^:#\[\.,]*$/;
  rt.filter = function(t, e, n) {
    var i = e[0];
    return n && (t = ":not(" + t + ")"),
    1 === e.length && 1 === i.nodeType ? rt.find.matchesSelector(i, t) ? [i] : [] : rt.find.matches(t, rt.grep(e, function(t) {
      return 1 === t.nodeType
    }))
  }
  ,
  rt.fn.extend({
    find: function(t) {
      var e, n = [], i = this, r = i.length;
      if ("string" != typeof t)
        return this.pushStack(rt(t).filter(function() {
          for (e = 0; r > e; e++)
            if (rt.contains(i[e], this))
              return !0
        }));
      for (e = 0; r > e; e++)
        rt.find(t, i[e], n);
      return n = this.pushStack(r > 1 ? rt.unique(n) : n),
      n.selector = this.selector ? this.selector + " " + t : t,
      n
    },
    filter: function(t) {
      return this.pushStack(i(this, t || [], !1))
    },
    not: function(t) {
      return this.pushStack(i(this, t || [], !0))
    },
    is: function(t) {
      return !!i(this, "string" == typeof t && ct.test(t) ? rt(t) : t || [], !1).length
    }
  });
  var ft, pt = t.document, mt = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/, gt = rt.fn.init = function(t, e) {
    var n, i;
    if (!t)
      return this;
    if ("string" == typeof t) {
      if (n = "<" === t.charAt(0) && ">" === t.charAt(t.length - 1) && t.length >= 3 ? [null, t, null] : mt.exec(t),
      !n || !n[1] && e)
        return !e || e.jquery ? (e || ft).find(t) : this.constructor(e).find(t);
      if (n[1]) {
        if (e = e instanceof rt ? e[0] : e,
        rt.merge(this, rt.parseHTML(n[1], e && e.nodeType ? e.ownerDocument || e : pt, !0)),
        ht.test(n[1]) && rt.isPlainObject(e))
          for (n in e)
            rt.isFunction(this[n]) ? this[n](e[n]) : this.attr(n, e[n]);
        return this
      }
      if (i = pt.getElementById(n[2]),
      i && i.parentNode) {
        if (i.id !== n[2])
          return ft.find(t);
        this.length = 1,
        this[0] = i
      }
      return this.context = pt,
      this.selector = t,
      this
    }
    return t.nodeType ? (this.context = this[0] = t,
    this.length = 1,
    this) : rt.isFunction(t) ? "undefined" != typeof ft.ready ? ft.ready(t) : t(rt) : (void 0 !== t.selector && (this.selector = t.selector,
    this.context = t.context),
    rt.makeArray(t, this))
  }
  ;
  gt.prototype = rt.fn,
  ft = rt(pt);
  var vt = /^(?:parents|prev(?:Until|All))/
    , yt = {
    children: !0,
    contents: !0,
    next: !0,
    prev: !0
  };
  rt.extend({
    dir: function(t, e, n) {
      for (var i = [], r = t[e]; r && 9 !== r.nodeType && (void 0 === n || 1 !== r.nodeType || !rt(r).is(n)); )
        1 === r.nodeType && i.push(r),
        r = r[e];
      return i
    },
    sibling: function(t, e) {
      for (var n = []; t; t = t.nextSibling)
        1 === t.nodeType && t !== e && n.push(t);
      return n
    }
  }),
  rt.fn.extend({
    has: function(t) {
      var e, n = rt(t, this), i = n.length;
      return this.filter(function() {
        for (e = 0; i > e; e++)
          if (rt.contains(this, n[e]))
            return !0
      })
    },
    closest: function(t, e) {
      for (var n, i = 0, r = this.length, o = [], s = ct.test(t) || "string" != typeof t ? rt(t, e || this.context) : 0; r > i; i++)
        for (n = this[i]; n && n !== e; n = n.parentNode)
          if (n.nodeType < 11 && (s ? s.index(n) > -1 : 1 === n.nodeType && rt.find.matchesSelector(n, t))) {
            o.push(n);
            break
          }
      return this.pushStack(o.length > 1 ? rt.unique(o) : o)
    },
    index: function(t) {
      return t ? "string" == typeof t ? rt.inArray(this[0], rt(t)) : rt.inArray(t.jquery ? t[0] : t, this) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1
    },
    add: function(t, e) {
      return this.pushStack(rt.unique(rt.merge(this.get(), rt(t, e))))
    },
    addBack: function(t) {
      return this.add(null == t ? this.prevObject : this.prevObject.filter(t))
    }
  }),
  rt.each({
    parent: function(t) {
      var e = t.parentNode;
      return e && 11 !== e.nodeType ? e : null
    },
    parents: function(t) {
      return rt.dir(t, "parentNode")
    },
    parentsUntil: function(t, e, n) {
      return rt.dir(t, "parentNode", n)
    },
    next: function(t) {
      return r(t, "nextSibling")
    },
    prev: function(t) {
      return r(t, "previousSibling")
    },
    nextAll: function(t) {
      return rt.dir(t, "nextSibling")
    },
    prevAll: function(t) {
      return rt.dir(t, "previousSibling")
    },
    nextUntil: function(t, e, n) {
      return rt.dir(t, "nextSibling", n)
    },
    prevUntil: function(t, e, n) {
      return rt.dir(t, "previousSibling", n)
    },
    siblings: function(t) {
      return rt.sibling((t.parentNode || {}).firstChild, t)
    },
    children: function(t) {
      return rt.sibling(t.firstChild)
    },
    contents: function(t) {
      return rt.nodeName(t, "iframe") ? t.contentDocument || t.contentWindow.document : rt.merge([], t.childNodes)
    }
  }, function(t, e) {
    rt.fn[t] = function(n, i) {
      var r = rt.map(this, e, n);
      return "Until" !== t.slice(-5) && (i = n),
      i && "string" == typeof i && (r = rt.filter(i, r)),
      this.length > 1 && (yt[t] || (r = rt.unique(r)),
      vt.test(t) && (r = r.reverse())),
      this.pushStack(r)
    }
  });
  var bt = /\S+/g
    , _t = {};
  rt.Callbacks = function(t) {
    t = "string" == typeof t ? _t[t] || o(t) : rt.extend({}, t);
    var e, n, i, r, s, a, l = [], u = !t.once && [], c = function(o) {
      for (n = t.memory && o,
      i = !0,
      s = a || 0,
      a = 0,
      r = l.length,
      e = !0; l && r > s; s++)
        if (l[s].apply(o[0], o[1]) === !1 && t.stopOnFalse) {
          n = !1;
          break
        }
      e = !1,
      l && (u ? u.length && c(u.shift()) : n ? l = [] : h.disable())
    }, h = {
      add: function() {
        if (l) {
          var i = l.length;
          !function o(e) {
            rt.each(e, function(e, n) {
              var i = rt.type(n);
              "function" === i ? t.unique && h.has(n) || l.push(n) : n && n.length && "string" !== i && o(n)
            })
          }(arguments),
          e ? r = l.length : n && (a = i,
          c(n))
        }
        return this
      },
      remove: function() {
        return l && rt.each(arguments, function(t, n) {
          for (var i; (i = rt.inArray(n, l, i)) > -1; )
            l.splice(i, 1),
            e && (r >= i && r--,
            s >= i && s--)
        }),
        this
      },
      has: function(t) {
        return t ? rt.inArray(t, l) > -1 : !(!l || !l.length)
      },
      empty: function() {
        return l = [],
        r = 0,
        this
      },
      disable: function() {
        return l = u = n = void 0,
        this
      },
      disabled: function() {
        return !l
      },
      lock: function() {
        return u = void 0,
        n || h.disable(),
        this
      },
      locked: function() {
        return !u
      },
      fireWith: function(t, n) {
        return !l || i && !u || (n = n || [],
        n = [t, n.slice ? n.slice() : n],
        e ? u.push(n) : c(n)),
        this
      },
      fire: function() {
        return h.fireWith(this, arguments),
        this
      },
      fired: function() {
        return !!i
      }
    };
    return h
  }
  ,
  rt.extend({
    Deferred: function(t) {
      var e = [["resolve", "done", rt.Callbacks("once memory"), "resolved"], ["reject", "fail", rt.Callbacks("once memory"), "rejected"], ["notify", "progress", rt.Callbacks("memory")]]
        , n = "pending"
        , i = {
        state: function() {
          return n
        },
        always: function() {
          return r.done(arguments).fail(arguments),
          this
        },
        then: function() {
          var t = arguments;
          return rt.Deferred(function(n) {
            rt.each(e, function(e, o) {
              var s = rt.isFunction(t[e]) && t[e];
              r[o[1]](function() {
                var t = s && s.apply(this, arguments);
                t && rt.isFunction(t.promise) ? t.promise().done(n.resolve).fail(n.reject).progress(n.notify) : n[o[0] + "With"](this === i ? n.promise() : this, s ? [t] : arguments)
              })
            }),
            t = null
          }).promise()
        },
        promise: function(t) {
          return null != t ? rt.extend(t, i) : i
        }
      }
        , r = {};
      return i.pipe = i.then,
      rt.each(e, function(t, o) {
        var s = o[2]
          , a = o[3];
        i[o[1]] = s.add,
        a && s.add(function() {
          n = a
        }, e[1 ^ t][2].disable, e[2][2].lock),
        r[o[0]] = function() {
          return r[o[0] + "With"](this === r ? i : this, arguments),
          this
        }
        ,
        r[o[0] + "With"] = s.fireWith
      }),
      i.promise(r),
      t && t.call(r, r),
      r
    },
    when: function(t) {
      var e, n, i, r = 0, o = X.call(arguments), s = o.length, a = 1 !== s || t && rt.isFunction(t.promise) ? s : 0, l = 1 === a ? t : rt.Deferred(), u = function(t, n, i) {
        return function(r) {
          n[t] = this,
          i[t] = arguments.length > 1 ? X.call(arguments) : r,
          i === e ? l.notifyWith(n, i) : --a || l.resolveWith(n, i)
        }
      };
      if (s > 1)
        for (e = new Array(s),
        n = new Array(s),
        i = new Array(s); s > r; r++)
          o[r] && rt.isFunction(o[r].promise) ? o[r].promise().done(u(r, i, o)).fail(l.reject).progress(u(r, n, e)) : --a;
      return a || l.resolveWith(i, o),
      l.promise()
    }
  });
  var wt;
  rt.fn.ready = function(t) {
    return rt.ready.promise().done(t),
    this
  }
  ,
  rt.extend({
    isReady: !1,
    readyWait: 1,
    holdReady: function(t) {
      t ? rt.readyWait++ : rt.ready(!0)
    },
    ready: function(t) {
      if (t === !0 ? !--rt.readyWait : !rt.isReady) {
        if (!pt.body)
          return setTimeout(rt.ready);
        rt.isReady = !0,
        t !== !0 && --rt.readyWait > 0 || (wt.resolveWith(pt, [rt]),
        rt.fn.triggerHandler && (rt(pt).triggerHandler("ready"),
        rt(pt).off("ready")))
      }
    }
  }),
  rt.ready.promise = function(e) {
    if (!wt)
      if (wt = rt.Deferred(),
      "complete" === pt.readyState)
        setTimeout(rt.ready);
      else if (pt.addEventListener)
        pt.addEventListener("DOMContentLoaded", a, !1),
        t.addEventListener("load", a, !1);
      else {
        pt.attachEvent("onreadystatechange", a),
        t.attachEvent("onload", a);
        var n = !1;
        try {
          n = null == t.frameElement && pt.documentElement
        } catch (i) {}
        n && n.doScroll && !function r() {
          if (!rt.isReady) {
            try {
              n.doScroll("left")
            } catch (t) {
              return setTimeout(r, 50)
            }
            s(),
            rt.ready()
          }
        }()
      }
    return wt.promise(e)
  }
  ;
  var xt, kt = "undefined";
  for (xt in rt(nt))
    break;
  nt.ownLast = "0" !== xt,
  nt.inlineBlockNeedsLayout = !1,
  rt(function() {
    var t, e, n, i;
    n = pt.getElementsByTagName("body")[0],
    n && n.style && (e = pt.createElement("div"),
    i = pt.createElement("div"),
    i.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px",
    n.appendChild(i).appendChild(e),
    typeof e.style.zoom !== kt && (e.style.cssText = "display:inline;margin:0;border:0;padding:1px;width:1px;zoom:1",
    nt.inlineBlockNeedsLayout = t = 3 === e.offsetWidth,
    t && (n.style.zoom = 1)),
    n.removeChild(i))
  }),
  function() {
    var t = pt.createElement("div");
    if (null == nt.deleteExpando) {
      nt.deleteExpando = !0;
      try {
        delete t.test
      } catch (e) {
        nt.deleteExpando = !1
      }
    }
    t = null
  }(),
  rt.acceptData = function(t) {
    var e = rt.noData[(t.nodeName + " ").toLowerCase()]
      , n = +t.nodeType || 1;
    return 1 !== n && 9 !== n ? !1 : !e || e !== !0 && t.getAttribute("classid") === e
  }
  ;
  var Ct = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/
    , Tt = /([A-Z])/g;
  rt.extend({
    cache: {},
    noData: {
      "applet ": !0,
      "embed ": !0,
      "object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
    },
    hasData: function(t) {
      return t = t.nodeType ? rt.cache[t[rt.expando]] : t[rt.expando],
      !!t && !u(t)
    },
    data: function(t, e, n) {
      return c(t, e, n)
    },
    removeData: function(t, e) {
      return h(t, e)
    },
    _data: function(t, e, n) {
      return c(t, e, n, !0)
    },
    _removeData: function(t, e) {
      return h(t, e, !0)
    }
  }),
  rt.fn.extend({
    data: function(t, e) {
      var n, i, r, o = this[0], s = o && o.attributes;
      if (void 0 === t) {
        if (this.length && (r = rt.data(o),
        1 === o.nodeType && !rt._data(o, "parsedAttrs"))) {
          for (n = s.length; n--; )
            s[n] && (i = s[n].name,
            0 === i.indexOf("data-") && (i = rt.camelCase(i.slice(5)),
            l(o, i, r[i])));
          rt._data(o, "parsedAttrs", !0)
        }
        return r
      }
      return "object" == typeof t ? this.each(function() {
        rt.data(this, t)
      }) : arguments.length > 1 ? this.each(function() {
        rt.data(this, t, e)
      }) : o ? l(o, t, rt.data(o, t)) : void 0
    },
    removeData: function(t) {
      return this.each(function() {
        rt.removeData(this, t)
      })
    }
  }),
  rt.extend({
    queue: function(t, e, n) {
      var i;
      return t ? (e = (e || "fx") + "queue",
      i = rt._data(t, e),
      n && (!i || rt.isArray(n) ? i = rt._data(t, e, rt.makeArray(n)) : i.push(n)),
      i || []) : void 0
    },
    dequeue: function(t, e) {
      e = e || "fx";
      var n = rt.queue(t, e)
        , i = n.length
        , r = n.shift()
        , o = rt._queueHooks(t, e)
        , s = function() {
        rt.dequeue(t, e)
      };
      "inprogress" === r && (r = n.shift(),
      i--),
      r && ("fx" === e && n.unshift("inprogress"),
      delete o.stop,
      r.call(t, s, o)),
      !i && o && o.empty.fire()
    },
    _queueHooks: function(t, e) {
      var n = e + "queueHooks";
      return rt._data(t, n) || rt._data(t, n, {
        empty: rt.Callbacks("once memory").add(function() {
          rt._removeData(t, e + "queue"),
          rt._removeData(t, n)
        })
      })
    }
  }),
  rt.fn.extend({
    queue: function(t, e) {
      var n = 2;
      return "string" != typeof t && (e = t,
      t = "fx",
      n--),
      arguments.length < n ? rt.queue(this[0], t) : void 0 === e ? this : this.each(function() {
        var n = rt.queue(this, t, e);
        rt._queueHooks(this, t),
        "fx" === t && "inprogress" !== n[0] && rt.dequeue(this, t)
      })
    },
    dequeue: function(t) {
      return this.each(function() {
        rt.dequeue(this, t)
      })
    },
    clearQueue: function(t) {
      return this.queue(t || "fx", [])
    },
    promise: function(t, e) {
      var n, i = 1, r = rt.Deferred(), o = this, s = this.length, a = function() {
        --i || r.resolveWith(o, [o])
      };
      for ("string" != typeof t && (e = t,
      t = void 0),
      t = t || "fx"; s--; )
        n = rt._data(o[s], t + "queueHooks"),
        n && n.empty && (i++,
        n.empty.add(a));
      return a(),
      r.promise(e)
    }
  });
  var $t = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source
    , St = ["Top", "Right", "Bottom", "Left"]
    , Dt = function(t, e) {
    return t = e || t,
    "none" === rt.css(t, "display") || !rt.contains(t.ownerDocument, t)
  }
    , Et = rt.access = function(t, e, n, i, r, o, s) {
    var a = 0
      , l = t.length
      , u = null == n;
    if ("object" === rt.type(n)) {
      r = !0;
      for (a in n)
        rt.access(t, e, a, n[a], !0, o, s)
    } else if (void 0 !== i && (r = !0,
    rt.isFunction(i) || (s = !0),
    u && (s ? (e.call(t, i),
    e = null) : (u = e,
    e = function(t, e, n) {
      return u.call(rt(t), n)
    }
    )),
    e))
      for (; l > a; a++)
        e(t[a], n, s ? i : i.call(t[a], a, e(t[a], n)));
    return r ? t : u ? e.call(t) : l ? e(t[0], n) : o
  }
    , Ot = /^(?:checkbox|radio)$/i;
  !function() {
    var t = pt.createElement("input")
      , e = pt.createElement("div")
      , n = pt.createDocumentFragment();
    if (e.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",
    nt.leadingWhitespace = 3 === e.firstChild.nodeType,
    nt.tbody = !e.getElementsByTagName("tbody").length,
    nt.htmlSerialize = !!e.getElementsByTagName("link").length,
    nt.html5Clone = "<:nav></:nav>" !== pt.createElement("nav").cloneNode(!0).outerHTML,
    t.type = "checkbox",
    t.checked = !0,
    n.appendChild(t),
    nt.appendChecked = t.checked,
    e.innerHTML = "<textarea>x</textarea>",
    nt.noCloneChecked = !!e.cloneNode(!0).lastChild.defaultValue,
    n.appendChild(e),
    e.innerHTML = "<input type='radio' checked='checked' name='t'/>",
    nt.checkClone = e.cloneNode(!0).cloneNode(!0).lastChild.checked,
    nt.noCloneEvent = !0,
    e.attachEvent && (e.attachEvent("onclick", function() {
      nt.noCloneEvent = !1
    }),
    e.cloneNode(!0).click()),
    null == nt.deleteExpando) {
      nt.deleteExpando = !0;
      try {
        delete e.test
      } catch (i) {
        nt.deleteExpando = !1
      }
    }
  }(),
  function() {
    var e, n, i = pt.createElement("div");
    for (e in {
      submit: !0,
      change: !0,
      focusin: !0
    })
      n = "on" + e,
      (nt[e + "Bubbles"] = n in t) || (i.setAttribute(n, "t"),
      nt[e + "Bubbles"] = i.attributes[n].expando === !1);
    i = null
  }();
  var At = /^(?:input|select|textarea)$/i
    , Nt = /^key/
    , jt = /^(?:mouse|pointer|contextmenu)|click/
    , Mt = /^(?:focusinfocus|focusoutblur)$/
    , Lt = /^([^.]*)(?:\.(.+)|)$/;
  rt.event = {
    global: {},
    add: function(t, e, n, i, r) {
      var o, s, a, l, u, c, h, d, f, p, m, g = rt._data(t);
      if (g) {
        for (n.handler && (l = n,
        n = l.handler,
        r = l.selector),
        n.guid || (n.guid = rt.guid++),
        (s = g.events) || (s = g.events = {}),
        (c = g.handle) || (c = g.handle = function(t) {
          return typeof rt === kt || t && rt.event.triggered === t.type ? void 0 : rt.event.dispatch.apply(c.elem, arguments)
        }
        ,
        c.elem = t),
        e = (e || "").match(bt) || [""],
        a = e.length; a--; )
          o = Lt.exec(e[a]) || [],
          f = m = o[1],
          p = (o[2] || "").split(".").sort(),
          f && (u = rt.event.special[f] || {},
          f = (r ? u.delegateType : u.bindType) || f,
          u = rt.event.special[f] || {},
          h = rt.extend({
            type: f,
            origType: m,
            data: i,
            handler: n,
            guid: n.guid,
            selector: r,
            needsContext: r && rt.expr.match.needsContext.test(r),
            namespace: p.join(".")
          }, l),
          (d = s[f]) || (d = s[f] = [],
          d.delegateCount = 0,
          u.setup && u.setup.call(t, i, p, c) !== !1 || (t.addEventListener ? t.addEventListener(f, c, !1) : t.attachEvent && t.attachEvent("on" + f, c))),
          u.add && (u.add.call(t, h),
          h.handler.guid || (h.handler.guid = n.guid)),
          r ? d.splice(d.delegateCount++, 0, h) : d.push(h),
          rt.event.global[f] = !0);
        t = null
      }
    },
    remove: function(t, e, n, i, r) {
      var o, s, a, l, u, c, h, d, f, p, m, g = rt.hasData(t) && rt._data(t);
      if (g && (c = g.events)) {
        for (e = (e || "").match(bt) || [""],
        u = e.length; u--; )
          if (a = Lt.exec(e[u]) || [],
          f = m = a[1],
          p = (a[2] || "").split(".").sort(),
          f) {
            for (h = rt.event.special[f] || {},
            f = (i ? h.delegateType : h.bindType) || f,
            d = c[f] || [],
            a = a[2] && new RegExp("(^|\\.)" + p.join("\\.(?:.*\\.|)") + "(\\.|$)"),
            l = o = d.length; o--; )
              s = d[o],
              !r && m !== s.origType || n && n.guid !== s.guid || a && !a.test(s.namespace) || i && i !== s.selector && ("**" !== i || !s.selector) || (d.splice(o, 1),
              s.selector && d.delegateCount--,
              h.remove && h.remove.call(t, s));
            l && !d.length && (h.teardown && h.teardown.call(t, p, g.handle) !== !1 || rt.removeEvent(t, f, g.handle),
            delete c[f])
          } else
            for (f in c)
              rt.event.remove(t, f + e[u], n, i, !0);
        rt.isEmptyObject(c) && (delete g.handle,
        rt._removeData(t, "events"))
      }
    },
    trigger: function(e, n, i, r) {
      var o, s, a, l, u, c, h, d = [i || pt], f = et.call(e, "type") ? e.type : e, p = et.call(e, "namespace") ? e.namespace.split(".") : [];
      if (a = c = i = i || pt,
      3 !== i.nodeType && 8 !== i.nodeType && !Mt.test(f + rt.event.triggered) && (f.indexOf(".") >= 0 && (p = f.split("."),
      f = p.shift(),
      p.sort()),
      s = f.indexOf(":") < 0 && "on" + f,
      e = e[rt.expando] ? e : new rt.Event(f,"object" == typeof e && e),
      e.isTrigger = r ? 2 : 3,
      e.namespace = p.join("."),
      e.namespace_re = e.namespace ? new RegExp("(^|\\.)" + p.join("\\.(?:.*\\.|)") + "(\\.|$)") : null,
      e.result = void 0,
      e.target || (e.target = i),
      n = null == n ? [e] : rt.makeArray(n, [e]),
      u = rt.event.special[f] || {},
      r || !u.trigger || u.trigger.apply(i, n) !== !1)) {
        if (!r && !u.noBubble && !rt.isWindow(i)) {
          for (l = u.delegateType || f,
          Mt.test(l + f) || (a = a.parentNode); a; a = a.parentNode)
            d.push(a),
            c = a;
          c === (i.ownerDocument || pt) && d.push(c.defaultView || c.parentWindow || t)
        }
        for (h = 0; (a = d[h++]) && !e.isPropagationStopped(); )
          e.type = h > 1 ? l : u.bindType || f,
          o = (rt._data(a, "events") || {})[e.type] && rt._data(a, "handle"),
          o && o.apply(a, n),
          o = s && a[s],
          o && o.apply && rt.acceptData(a) && (e.result = o.apply(a, n),
          e.result === !1 && e.preventDefault());
        if (e.type = f,
        !r && !e.isDefaultPrevented() && (!u._default || u._default.apply(d.pop(), n) === !1) && rt.acceptData(i) && s && i[f] && !rt.isWindow(i)) {
          c = i[s],
          c && (i[s] = null),
          rt.event.triggered = f;
          try {
            i[f]()
          } catch (m) {}
          rt.event.triggered = void 0,
          c && (i[s] = c)
        }
        return e.result
      }
    },
    dispatch: function(t) {
      t = rt.event.fix(t);
      var e, n, i, r, o, s = [], a = X.call(arguments), l = (rt._data(this, "events") || {})[t.type] || [], u = rt.event.special[t.type] || {};
      if (a[0] = t,
      t.delegateTarget = this,
      !u.preDispatch || u.preDispatch.call(this, t) !== !1) {
        for (s = rt.event.handlers.call(this, t, l),
        e = 0; (r = s[e++]) && !t.isPropagationStopped(); )
          for (t.currentTarget = r.elem,
          o = 0; (i = r.handlers[o++]) && !t.isImmediatePropagationStopped(); )
            (!t.namespace_re || t.namespace_re.test(i.namespace)) && (t.handleObj = i,
            t.data = i.data,
            n = ((rt.event.special[i.origType] || {}).handle || i.handler).apply(r.elem, a),
            void 0 !== n && (t.result = n) === !1 && (t.preventDefault(),
            t.stopPropagation()));
        return u.postDispatch && u.postDispatch.call(this, t),
        t.result
      }
    },
    handlers: function(t, e) {
      var n, i, r, o, s = [], a = e.delegateCount, l = t.target;
      if (a && l.nodeType && (!t.button || "click" !== t.type))
        for (; l != this; l = l.parentNode || this)
          if (1 === l.nodeType && (l.disabled !== !0 || "click" !== t.type)) {
            for (r = [],
            o = 0; a > o; o++)
              i = e[o],
              n = i.selector + " ",
              void 0 === r[n] && (r[n] = i.needsContext ? rt(n, this).index(l) >= 0 : rt.find(n, this, null, [l]).length),
              r[n] && r.push(i);
            r.length && s.push({
              elem: l,
              handlers: r
            })
          }
      return a < e.length && s.push({
        elem: this,
        handlers: e.slice(a)
      }),
      s
    },
    fix: function(t) {
      if (t[rt.expando])
        return t;
      var e, n, i, r = t.type, o = t, s = this.fixHooks[r];
      for (s || (this.fixHooks[r] = s = jt.test(r) ? this.mouseHooks : Nt.test(r) ? this.keyHooks : {}),
      i = s.props ? this.props.concat(s.props) : this.props,
      t = new rt.Event(o),
      e = i.length; e--; )
        n = i[e],
        t[n] = o[n];
      return t.target || (t.target = o.srcElement || pt),
      3 === t.target.nodeType && (t.target = t.target.parentNode),
      t.metaKey = !!t.metaKey,
      s.filter ? s.filter(t, o) : t
    },
    props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
    fixHooks: {},
    keyHooks: {
      props: "char charCode key keyCode".split(" "),
      filter: function(t, e) {
        return null == t.which && (t.which = null != e.charCode ? e.charCode : e.keyCode),
        t
      }
    },
    mouseHooks: {
      props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
      filter: function(t, e) {
        var n, i, r, o = e.button, s = e.fromElement;
        return null == t.pageX && null != e.clientX && (i = t.target.ownerDocument || pt,
        r = i.documentElement,
        n = i.body,
        t.pageX = e.clientX + (r && r.scrollLeft || n && n.scrollLeft || 0) - (r && r.clientLeft || n && n.clientLeft || 0),
        t.pageY = e.clientY + (r && r.scrollTop || n && n.scrollTop || 0) - (r && r.clientTop || n && n.clientTop || 0)),
        !t.relatedTarget && s && (t.relatedTarget = s === t.target ? e.toElement : s),
        t.which || void 0 === o || (t.which = 1 & o ? 1 : 2 & o ? 3 : 4 & o ? 2 : 0),
        t
      }
    },
    special: {
      load: {
        noBubble: !0
      },
      focus: {
        trigger: function() {
          if (this !== p() && this.focus)
            try {
              return this.focus(),
              !1
            } catch (t) {}
        },
        delegateType: "focusin"
      },
      blur: {
        trigger: function() {
          return this === p() && this.blur ? (this.blur(),
          !1) : void 0
        },
        delegateType: "focusout"
      },
      click: {
        trigger: function() {
          return rt.nodeName(this, "input") && "checkbox" === this.type && this.click ? (this.click(),
          !1) : void 0
        },
        _default: function(t) {
          return rt.nodeName(t.target, "a")
        }
      },
      beforeunload: {
        postDispatch: function(t) {
          void 0 !== t.result && t.originalEvent && (t.originalEvent.returnValue = t.result)
        }
      }
    },
    simulate: function(t, e, n, i) {
      var r = rt.extend(new rt.Event, n, {
        type: t,
        isSimulated: !0,
        originalEvent: {}
      });
      i ? rt.event.trigger(r, null, e) : rt.event.dispatch.call(e, r),
      r.isDefaultPrevented() && n.preventDefault()
    }
  },
  rt.removeEvent = pt.removeEventListener ? function(t, e, n) {
    t.removeEventListener && t.removeEventListener(e, n, !1)
  }
  : function(t, e, n) {
    var i = "on" + e;
    t.detachEvent && (typeof t[i] === kt && (t[i] = null),
    t.detachEvent(i, n))
  }
  ,
  rt.Event = function(t, e) {
    return this instanceof rt.Event ? (t && t.type ? (this.originalEvent = t,
    this.type = t.type,
    this.isDefaultPrevented = t.defaultPrevented || void 0 === t.defaultPrevented && t.returnValue === !1 ? d : f) : this.type = t,
    e && rt.extend(this, e),
    this.timeStamp = t && t.timeStamp || rt.now(),
    void (this[rt.expando] = !0)) : new rt.Event(t,e)
  }
  ,
  rt.Event.prototype = {
    isDefaultPrevented: f,
    isPropagationStopped: f,
    isImmediatePropagationStopped: f,
    preventDefault: function() {
      var t = this.originalEvent;
      this.isDefaultPrevented = d,
      t && (t.preventDefault ? t.preventDefault() : t.returnValue = !1)
    },
    stopPropagation: function() {
      var t = this.originalEvent;
      this.isPropagationStopped = d,
      t && (t.stopPropagation && t.stopPropagation(),
      t.cancelBubble = !0)
    },
    stopImmediatePropagation: function() {
      var t = this.originalEvent;
      this.isImmediatePropagationStopped = d,
      t && t.stopImmediatePropagation && t.stopImmediatePropagation(),
      this.stopPropagation()
    }
  },
  rt.each({
    mouseenter: "mouseover",
    mouseleave: "mouseout",
    pointerenter: "pointerover",
    pointerleave: "pointerout"
  }, function(t, e) {
    rt.event.special[t] = {
      delegateType: e,
      bindType: e,
      handle: function(t) {
        var n, i = this, r = t.relatedTarget, o = t.handleObj;
        return (!r || r !== i && !rt.contains(i, r)) && (t.type = o.origType,
        n = o.handler.apply(this, arguments),
        t.type = e),
        n
      }
    }
  }),
  nt.submitBubbles || (rt.event.special.submit = {
    setup: function() {
      return rt.nodeName(this, "form") ? !1 : void rt.event.add(this, "click._submit keypress._submit", function(t) {
        var e = t.target
          , n = rt.nodeName(e, "input") || rt.nodeName(e, "button") ? e.form : void 0;
        n && !rt._data(n, "submitBubbles") && (rt.event.add(n, "submit._submit", function(t) {
          t._submit_bubble = !0
        }),
        rt._data(n, "submitBubbles", !0))
      })
    },
    postDispatch: function(t) {
      t._submit_bubble && (delete t._submit_bubble,
      this.parentNode && !t.isTrigger && rt.event.simulate("submit", this.parentNode, t, !0))
    },
    teardown: function() {
      return rt.nodeName(this, "form") ? !1 : void rt.event.remove(this, "._submit")
    }
  }),
  nt.changeBubbles || (rt.event.special.change = {
    setup: function() {
      return At.test(this.nodeName) ? (("checkbox" === this.type || "radio" === this.type) && (rt.event.add(this, "propertychange._change", function(t) {
        "checked" === t.originalEvent.propertyName && (this._just_changed = !0)
      }),
      rt.event.add(this, "click._change", function(t) {
        this._just_changed && !t.isTrigger && (this._just_changed = !1),
        rt.event.simulate("change", this, t, !0)
      })),
      !1) : void rt.event.add(this, "beforeactivate._change", function(t) {
        var e = t.target;
        At.test(e.nodeName) && !rt._data(e, "changeBubbles") && (rt.event.add(e, "change._change", function(t) {
          !this.parentNode || t.isSimulated || t.isTrigger || rt.event.simulate("change", this.parentNode, t, !0)
        }),
        rt._data(e, "changeBubbles", !0))
      })
    },
    handle: function(t) {
      var e = t.target;
      return this !== e || t.isSimulated || t.isTrigger || "radio" !== e.type && "checkbox" !== e.type ? t.handleObj.handler.apply(this, arguments) : void 0
    },
    teardown: function() {
      return rt.event.remove(this, "._change"),
      !At.test(this.nodeName)
    }
  }),
  nt.focusinBubbles || rt.each({
    focus: "focusin",
    blur: "focusout"
  }, function(t, e) {
    var n = function(t) {
      rt.event.simulate(e, t.target, rt.event.fix(t), !0)
    };
    rt.event.special[e] = {
      setup: function() {
        var i = this.ownerDocument || this
          , r = rt._data(i, e);
        r || i.addEventListener(t, n, !0),
        rt._data(i, e, (r || 0) + 1)
      },
      teardown: function() {
        var i = this.ownerDocument || this
          , r = rt._data(i, e) - 1;
        r ? rt._data(i, e, r) : (i.removeEventListener(t, n, !0),
        rt._removeData(i, e))
      }
    }
  }),
  rt.fn.extend({
    on: function(t, e, n, i, r) {
      var o, s;
      if ("object" == typeof t) {
        "string" != typeof e && (n = n || e,
        e = void 0);
        for (o in t)
          this.on(o, e, n, t[o], r);
        return this
      }
      if (null == n && null == i ? (i = e,
      n = e = void 0) : null == i && ("string" == typeof e ? (i = n,
      n = void 0) : (i = n,
      n = e,
      e = void 0)),
      i === !1)
        i = f;
      else if (!i)
        return this;
      return 1 === r && (s = i,
      i = function(t) {
        return rt().off(t),
        s.apply(this, arguments)
      }
      ,
      i.guid = s.guid || (s.guid = rt.guid++)),
      this.each(function() {
        rt.event.add(this, t, i, n, e)
      })
    },
    one: function(t, e, n, i) {
      return this.on(t, e, n, i, 1)
    },
    off: function(t, e, n) {
      var i, r;
      if (t && t.preventDefault && t.handleObj)
        return i = t.handleObj,
        rt(t.delegateTarget).off(i.namespace ? i.origType + "." + i.namespace : i.origType, i.selector, i.handler),
        this;
      if ("object" == typeof t) {
        for (r in t)
          this.off(r, e, t[r]);
        return this
      }
      return (e === !1 || "function" == typeof e) && (n = e,
      e = void 0),
      n === !1 && (n = f),
      this.each(function() {
        rt.event.remove(this, t, n, e)
      })
    },
    trigger: function(t, e) {
      return this.each(function() {
        rt.event.trigger(t, e, this)
      })
    },
    triggerHandler: function(t, e) {
      var n = this[0];
      return n ? rt.event.trigger(t, e, n, !0) : void 0
    }
  });
  var Pt = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video"
    , Ft = / jQuery\d+="(?:null|\d+)"/g
    , It = new RegExp("<(?:" + Pt + ")[\\s/>]","i")
    , Ht = /^\s+/
    , Rt = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi
    , Wt = /<([\w:]+)/
    , Yt = /<tbody/i
    , qt = /<|&#?\w+;/
    , Ut = /<(?:script|style|link)/i
    , Bt = /checked\s*(?:[^=]|=\s*.checked.)/i
    , Vt = /^$|\/(?:java|ecma)script/i
    , zt = /^true\/(.*)/
    , Gt = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g
    , Xt = {
    option: [1, "<select multiple='multiple'>", "</select>"],
    legend: [1, "<fieldset>", "</fieldset>"],
    area: [1, "<map>", "</map>"],
    param: [1, "<object>", "</object>"],
    thead: [1, "<table>", "</table>"],
    tr: [2, "<table><tbody>", "</tbody></table>"],
    col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
    td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
    _default: nt.htmlSerialize ? [0, "", ""] : [1, "X<div>", "</div>"]
  }
    , Jt = m(pt)
    , Qt = Jt.appendChild(pt.createElement("div"));
  Xt.optgroup = Xt.option,
  Xt.tbody = Xt.tfoot = Xt.colgroup = Xt.caption = Xt.thead,
  Xt.th = Xt.td,
  rt.extend({
    clone: function(t, e, n) {
      var i, r, o, s, a, l = rt.contains(t.ownerDocument, t);
      if (nt.html5Clone || rt.isXMLDoc(t) || !It.test("<" + t.nodeName + ">") ? o = t.cloneNode(!0) : (Qt.innerHTML = t.outerHTML,
      Qt.removeChild(o = Qt.firstChild)),
      !(nt.noCloneEvent && nt.noCloneChecked || 1 !== t.nodeType && 11 !== t.nodeType || rt.isXMLDoc(t)))
        for (i = g(o),
        a = g(t),
        s = 0; null != (r = a[s]); ++s)
          i[s] && k(r, i[s]);
      if (e)
        if (n)
          for (a = a || g(t),
          i = i || g(o),
          s = 0; null != (r = a[s]); s++)
            x(r, i[s]);
        else
          x(t, o);
      return i = g(o, "script"),
      i.length > 0 && w(i, !l && g(t, "script")),
      i = a = r = null,
      o
    },
    buildFragment: function(t, e, n, i) {
      for (var r, o, s, a, l, u, c, h = t.length, d = m(e), f = [], p = 0; h > p; p++)
        if (o = t[p],
        o || 0 === o)
          if ("object" === rt.type(o))
            rt.merge(f, o.nodeType ? [o] : o);
          else if (qt.test(o)) {
            for (a = a || d.appendChild(e.createElement("div")),
            l = (Wt.exec(o) || ["", ""])[1].toLowerCase(),
            c = Xt[l] || Xt._default,
            a.innerHTML = c[1] + o.replace(Rt, "<$1></$2>") + c[2],
            r = c[0]; r--; )
              a = a.lastChild;
            if (!nt.leadingWhitespace && Ht.test(o) && f.push(e.createTextNode(Ht.exec(o)[0])),
            !nt.tbody)
              for (o = "table" !== l || Yt.test(o) ? "<table>" !== c[1] || Yt.test(o) ? 0 : a : a.firstChild,
              r = o && o.childNodes.length; r--; )
                rt.nodeName(u = o.childNodes[r], "tbody") && !u.childNodes.length && o.removeChild(u);
            for (rt.merge(f, a.childNodes),
            a.textContent = ""; a.firstChild; )
              a.removeChild(a.firstChild);
            a = d.lastChild
          } else
            f.push(e.createTextNode(o));
      for (a && d.removeChild(a),
      nt.appendChecked || rt.grep(g(f, "input"), v),
      p = 0; o = f[p++]; )
        if ((!i || -1 === rt.inArray(o, i)) && (s = rt.contains(o.ownerDocument, o),
        a = g(d.appendChild(o), "script"),
        s && w(a),
        n))
          for (r = 0; o = a[r++]; )
            Vt.test(o.type || "") && n.push(o);
      return a = null,
      d
    },
    cleanData: function(t, e) {
      for (var n, i, r, o, s = 0, a = rt.expando, l = rt.cache, u = nt.deleteExpando, c = rt.event.special; null != (n = t[s]); s++)
        if ((e || rt.acceptData(n)) && (r = n[a],
        o = r && l[r])) {
          if (o.events)
            for (i in o.events)
              c[i] ? rt.event.remove(n, i) : rt.removeEvent(n, i, o.handle);
          l[r] && (delete l[r],
          u ? delete n[a] : typeof n.removeAttribute !== kt ? n.removeAttribute(a) : n[a] = null,
          G.push(r))
        }
    }
  }),
  rt.fn.extend({
    text: function(t) {
      return Et(this, function(t) {
        return void 0 === t ? rt.text(this) : this.empty().append((this[0] && this[0].ownerDocument || pt).createTextNode(t))
      }, null, t, arguments.length)
    },
    append: function() {
      return this.domManip(arguments, function(t) {
        if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
          var e = y(this, t);
          e.appendChild(t)
        }
      })
    },
    prepend: function() {
      return this.domManip(arguments, function(t) {
        if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
          var e = y(this, t);
          e.insertBefore(t, e.firstChild)
        }
      })
    },
    before: function() {
      return this.domManip(arguments, function(t) {
        this.parentNode && this.parentNode.insertBefore(t, this)
      })
    },
    after: function() {
      return this.domManip(arguments, function(t) {
        this.parentNode && this.parentNode.insertBefore(t, this.nextSibling)
      })
    },
    remove: function(t, e) {
      for (var n, i = t ? rt.filter(t, this) : this, r = 0; null != (n = i[r]); r++)
        e || 1 !== n.nodeType || rt.cleanData(g(n)),
        n.parentNode && (e && rt.contains(n.ownerDocument, n) && w(g(n, "script")),
        n.parentNode.removeChild(n));
      return this
    },
    empty: function() {
      for (var t, e = 0; null != (t = this[e]); e++) {
        for (1 === t.nodeType && rt.cleanData(g(t, !1)); t.firstChild; )
          t.removeChild(t.firstChild);
        t.options && rt.nodeName(t, "select") && (t.options.length = 0)
      }
      return this
    },
    clone: function(t, e) {
      return t = null == t ? !1 : t,
      e = null == e ? t : e,
      this.map(function() {
        return rt.clone(this, t, e)
      })
    },
    html: function(t) {
      return Et(this, function(t) {
        var e = this[0] || {}
          , n = 0
          , i = this.length;
        if (void 0 === t)
          return 1 === e.nodeType ? e.innerHTML.replace(Ft, "") : void 0;
        if (!("string" != typeof t || Ut.test(t) || !nt.htmlSerialize && It.test(t) || !nt.leadingWhitespace && Ht.test(t) || Xt[(Wt.exec(t) || ["", ""])[1].toLowerCase()])) {
          t = t.replace(Rt, "<$1></$2>");
          try {
            for (; i > n; n++)
              e = this[n] || {},
              1 === e.nodeType && (rt.cleanData(g(e, !1)),
              e.innerHTML = t);
            e = 0
          } catch (r) {}
        }
        e && this.empty().append(t)
      }, null, t, arguments.length)
    },
    replaceWith: function() {
      var t = arguments[0];
      return this.domManip(arguments, function(e) {
        t = this.parentNode,
        rt.cleanData(g(this)),
        t && t.replaceChild(e, this)
      }),
      t && (t.length || t.nodeType) ? this : this.remove()
    },
    detach: function(t) {
      return this.remove(t, !0)
    },
    domManip: function(t, e) {
      t = J.apply([], t);
      var n, i, r, o, s, a, l = 0, u = this.length, c = this, h = u - 1, d = t[0], f = rt.isFunction(d);
      if (f || u > 1 && "string" == typeof d && !nt.checkClone && Bt.test(d))
        return this.each(function(n) {
          var i = c.eq(n);
          f && (t[0] = d.call(this, n, i.html())),
          i.domManip(t, e)
        });
      if (u && (a = rt.buildFragment(t, this[0].ownerDocument, !1, this),
      n = a.firstChild,
      1 === a.childNodes.length && (a = n),
      n)) {
        for (o = rt.map(g(a, "script"), b),
        r = o.length; u > l; l++)
          i = a,
          l !== h && (i = rt.clone(i, !0, !0),
          r && rt.merge(o, g(i, "script"))),
          e.call(this[l], i, l);
        if (r)
          for (s = o[o.length - 1].ownerDocument,
          rt.map(o, _),
          l = 0; r > l; l++)
            i = o[l],
            Vt.test(i.type || "") && !rt._data(i, "globalEval") && rt.contains(s, i) && (i.src ? rt._evalUrl && rt._evalUrl(i.src) : rt.globalEval((i.text || i.textContent || i.innerHTML || "").replace(Gt, "")));
        a = n = null
      }
      return this
    }
  }),
  rt.each({
    appendTo: "append",
    prependTo: "prepend",
    insertBefore: "before",
    insertAfter: "after",
    replaceAll: "replaceWith"
  }, function(t, e) {
    rt.fn[t] = function(t) {
      for (var n, i = 0, r = [], o = rt(t), s = o.length - 1; s >= i; i++)
        n = i === s ? this : this.clone(!0),
        rt(o[i])[e](n),
        Q.apply(r, n.get());
      return this.pushStack(r)
    }
  });
  var Zt, Kt = {};
  !function() {
    var t;
    nt.shrinkWrapBlocks = function() {
      if (null != t)
        return t;
      t = !1;
      var e, n, i;
      return n = pt.getElementsByTagName("body")[0],
      n && n.style ? (e = pt.createElement("div"),
      i = pt.createElement("div"),
      i.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px",
      n.appendChild(i).appendChild(e),
      typeof e.style.zoom !== kt && (e.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:1px;width:1px;zoom:1",
      e.appendChild(pt.createElement("div")).style.width = "5px",
      t = 3 !== e.offsetWidth),
      n.removeChild(i),
      t) : void 0
    }
  }();
  var te, ee, ne = /^margin/, ie = new RegExp("^(" + $t + ")(?!px)[a-z%]+$","i"), re = /^(top|right|bottom|left)$/;
  t.getComputedStyle ? (te = function(e) {
    return e.ownerDocument.defaultView.opener ? e.ownerDocument.defaultView.getComputedStyle(e, null) : t.getComputedStyle(e, null)
  }
  ,
  ee = function(t, e, n) {
    var i, r, o, s, a = t.style;
    return n = n || te(t),
    s = n ? n.getPropertyValue(e) || n[e] : void 0,
    n && ("" !== s || rt.contains(t.ownerDocument, t) || (s = rt.style(t, e)),
    ie.test(s) && ne.test(e) && (i = a.width,
    r = a.minWidth,
    o = a.maxWidth,
    a.minWidth = a.maxWidth = a.width = s,
    s = n.width,
    a.width = i,
    a.minWidth = r,
    a.maxWidth = o)),
    void 0 === s ? s : s + ""
  }
  ) : pt.documentElement.currentStyle && (te = function(t) {
    return t.currentStyle
  }
  ,
  ee = function(t, e, n) {
    var i, r, o, s, a = t.style;
    return n = n || te(t),
    s = n ? n[e] : void 0,
    null == s && a && a[e] && (s = a[e]),
    ie.test(s) && !re.test(e) && (i = a.left,
    r = t.runtimeStyle,
    o = r && r.left,
    o && (r.left = t.currentStyle.left),
    a.left = "fontSize" === e ? "1em" : s,
    s = a.pixelLeft + "px",
    a.left = i,
    o && (r.left = o)),
    void 0 === s ? s : s + "" || "auto"
  }
  ),
  !function() {
    function e() {
      var e, n, i, r;
      n = pt.getElementsByTagName("body")[0],
      n && n.style && (e = pt.createElement("div"),
      i = pt.createElement("div"),
      i.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px",
      n.appendChild(i).appendChild(e),
      e.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute",
      o = s = !1,
      l = !0,
      t.getComputedStyle && (o = "1%" !== (t.getComputedStyle(e, null) || {}).top,
      s = "4px" === (t.getComputedStyle(e, null) || {
        width: "4px"
      }).width,
      r = e.appendChild(pt.createElement("div")),
      r.style.cssText = e.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",
      r.style.marginRight = r.style.width = "0",
      e.style.width = "1px",
      l = !parseFloat((t.getComputedStyle(r, null) || {}).marginRight),
      e.removeChild(r)),
      e.innerHTML = "<table><tr><td></td><td>t</td></tr></table>",
      r = e.getElementsByTagName("td"),
      r[0].style.cssText = "margin:0;border:0;padding:0;display:none",
      a = 0 === r[0].offsetHeight,
      a && (r[0].style.display = "",
      r[1].style.display = "none",
      a = 0 === r[0].offsetHeight),
      n.removeChild(i))
    }
    var n, i, r, o, s, a, l;
    n = pt.createElement("div"),
    n.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",
    r = n.getElementsByTagName("a")[0],
    (i = r && r.style) && (i.cssText = "float:left;opacity:.5",
    nt.opacity = "0.5" === i.opacity,
    nt.cssFloat = !!i.cssFloat,
    n.style.backgroundClip = "content-box",
    n.cloneNode(!0).style.backgroundClip = "",
    nt.clearCloneStyle = "content-box" === n.style.backgroundClip,
    nt.boxSizing = "" === i.boxSizing || "" === i.MozBoxSizing || "" === i.WebkitBoxSizing,
    rt.extend(nt, {
      reliableHiddenOffsets: function() {
        return null == a && e(),
        a
      },
      boxSizingReliable: function() {
        return null == s && e(),
        s
      },
      pixelPosition: function() {
        return null == o && e(),
        o
      },
      reliableMarginRight: function() {
        return null == l && e(),
        l
      }
    }))
  }(),
  rt.swap = function(t, e, n, i) {
    var r, o, s = {};
    for (o in e)
      s[o] = t.style[o],
      t.style[o] = e[o];
    r = n.apply(t, i || []);
    for (o in e)
      t.style[o] = s[o];
    return r
  }
  ;
  var oe = /alpha\([^)]*\)/i
    , se = /opacity\s*=\s*([^)]*)/
    , ae = /^(none|table(?!-c[ea]).+)/
    , le = new RegExp("^(" + $t + ")(.*)$","i")
    , ue = new RegExp("^([+-])=(" + $t + ")","i")
    , ce = {
    position: "absolute",
    visibility: "hidden",
    display: "block"
  }
    , he = {
    letterSpacing: "0",
    fontWeight: "400"
  }
    , de = ["Webkit", "O", "Moz", "ms"];
  rt.extend({
    cssHooks: {
      opacity: {
        get: function(t, e) {
          if (e) {
            var n = ee(t, "opacity");
            return "" === n ? "1" : n
          }
        }
      }
    },
    cssNumber: {
      columnCount: !0,
      fillOpacity: !0,
      flexGrow: !0,
      flexShrink: !0,
      fontWeight: !0,
      lineHeight: !0,
      opacity: !0,
      order: !0,
      orphans: !0,
      widows: !0,
      zIndex: !0,
      zoom: !0
    },
    cssProps: {
      "float": nt.cssFloat ? "cssFloat" : "styleFloat"
    },
    style: function(t, e, n, i) {
      if (t && 3 !== t.nodeType && 8 !== t.nodeType && t.style) {
        var r, o, s, a = rt.camelCase(e), l = t.style;
        if (e = rt.cssProps[a] || (rt.cssProps[a] = S(l, a)),
        s = rt.cssHooks[e] || rt.cssHooks[a],
        void 0 === n)
          return s && "get"in s && void 0 !== (r = s.get(t, !1, i)) ? r : l[e];
        if (o = typeof n,
        "string" === o && (r = ue.exec(n)) && (n = (r[1] + 1) * r[2] + parseFloat(rt.css(t, e)),
        o = "number"),
        null != n && n === n && ("number" !== o || rt.cssNumber[a] || (n += "px"),
        nt.clearCloneStyle || "" !== n || 0 !== e.indexOf("background") || (l[e] = "inherit"),
        !(s && "set"in s && void 0 === (n = s.set(t, n, i)))))
          try {
            l[e] = n
          } catch (u) {}
      }
    },
    css: function(t, e, n, i) {
      var r, o, s, a = rt.camelCase(e);
      return e = rt.cssProps[a] || (rt.cssProps[a] = S(t.style, a)),
      s = rt.cssHooks[e] || rt.cssHooks[a],
      s && "get"in s && (o = s.get(t, !0, n)),
      void 0 === o && (o = ee(t, e, i)),
      "normal" === o && e in he && (o = he[e]),
      "" === n || n ? (r = parseFloat(o),
      n === !0 || rt.isNumeric(r) ? r || 0 : o) : o
    }
  }),
  rt.each(["height", "width"], function(t, e) {
    rt.cssHooks[e] = {
      get: function(t, n, i) {
        return n ? ae.test(rt.css(t, "display")) && 0 === t.offsetWidth ? rt.swap(t, ce, function() {
          return A(t, e, i)
        }) : A(t, e, i) : void 0
      },
      set: function(t, n, i) {
        var r = i && te(t);
        return E(t, n, i ? O(t, e, i, nt.boxSizing && "border-box" === rt.css(t, "boxSizing", !1, r), r) : 0)
      }
    }
  }),
  nt.opacity || (rt.cssHooks.opacity = {
    get: function(t, e) {
      return se.test((e && t.currentStyle ? t.currentStyle.filter : t.style.filter) || "") ? .01 * parseFloat(RegExp.$1) + "" : e ? "1" : ""
    },
    set: function(t, e) {
      var n = t.style
        , i = t.currentStyle
        , r = rt.isNumeric(e) ? "alpha(opacity=" + 100 * e + ")" : ""
        , o = i && i.filter || n.filter || "";
      n.zoom = 1,
      (e >= 1 || "" === e) && "" === rt.trim(o.replace(oe, "")) && n.removeAttribute && (n.removeAttribute("filter"),
      "" === e || i && !i.filter) || (n.filter = oe.test(o) ? o.replace(oe, r) : o + " " + r)
    }
  }),
  rt.cssHooks.marginRight = $(nt.reliableMarginRight, function(t, e) {
    return e ? rt.swap(t, {
      display: "inline-block"
    }, ee, [t, "marginRight"]) : void 0
  }),
  rt.each({
    margin: "",
    padding: "",
    border: "Width"
  }, function(t, e) {
    rt.cssHooks[t + e] = {
      expand: function(n) {
        for (var i = 0, r = {}, o = "string" == typeof n ? n.split(" ") : [n]; 4 > i; i++)
          r[t + St[i] + e] = o[i] || o[i - 2] || o[0];
        return r
      }
    },
    ne.test(t) || (rt.cssHooks[t + e].set = E)
  }),
  rt.fn.extend({
    css: function(t, e) {
      return Et(this, function(t, e, n) {
        var i, r, o = {}, s = 0;
        if (rt.isArray(e)) {
          for (i = te(t),
          r = e.length; r > s; s++)
            o[e[s]] = rt.css(t, e[s], !1, i);
          return o
        }
        return void 0 !== n ? rt.style(t, e, n) : rt.css(t, e)
      }, t, e, arguments.length > 1)
    },
    show: function() {
      return D(this, !0)
    },
    hide: function() {
      return D(this)
    },
    toggle: function(t) {
      return "boolean" == typeof t ? t ? this.show() : this.hide() : this.each(function() {
        Dt(this) ? rt(this).show() : rt(this).hide()
      })
    }
  }),
  rt.Tween = N,
  N.prototype = {
    constructor: N,
    init: function(t, e, n, i, r, o) {
      this.elem = t,
      this.prop = n,
      this.easing = r || "swing",
      this.options = e,
      this.start = this.now = this.cur(),
      this.end = i,
      this.unit = o || (rt.cssNumber[n] ? "" : "px")
    },
    cur: function() {
      var t = N.propHooks[this.prop];
      return t && t.get ? t.get(this) : N.propHooks._default.get(this)
    },
    run: function(t) {
      var e, n = N.propHooks[this.prop];
      return this.options.duration ? this.pos = e = rt.easing[this.easing](t, this.options.duration * t, 0, 1, this.options.duration) : this.pos = e = t,
      this.now = (this.end - this.start) * e + this.start,
      this.options.step && this.options.step.call(this.elem, this.now, this),
      n && n.set ? n.set(this) : N.propHooks._default.set(this),
      this
    }
  },
  N.prototype.init.prototype = N.prototype,
  N.propHooks = {
    _default: {
      get: function(t) {
        var e;
        return null == t.elem[t.prop] || t.elem.style && null != t.elem.style[t.prop] ? (e = rt.css(t.elem, t.prop, ""),
        e && "auto" !== e ? e : 0) : t.elem[t.prop]
      },
      set: function(t) {
        rt.fx.step[t.prop] ? rt.fx.step[t.prop](t) : t.elem.style && (null != t.elem.style[rt.cssProps[t.prop]] || rt.cssHooks[t.prop]) ? rt.style(t.elem, t.prop, t.now + t.unit) : t.elem[t.prop] = t.now
      }
    }
  },
  N.propHooks.scrollTop = N.propHooks.scrollLeft = {
    set: function(t) {
      t.elem.nodeType && t.elem.parentNode && (t.elem[t.prop] = t.now)
    }
  },
  rt.easing = {
    linear: function(t) {
      return t
    },
    swing: function(t) {
      return .5 - Math.cos(t * Math.PI) / 2
    }
  },
  rt.fx = N.prototype.init,
  rt.fx.step = {};
  var fe, pe, me = /^(?:toggle|show|hide)$/, ge = new RegExp("^(?:([+-])=|)(" + $t + ")([a-z%]*)$","i"), ve = /queueHooks$/, ye = [P], be = {
    "*": [function(t, e) {
      var n = this.createTween(t, e)
        , i = n.cur()
        , r = ge.exec(e)
        , o = r && r[3] || (rt.cssNumber[t] ? "" : "px")
        , s = (rt.cssNumber[t] || "px" !== o && +i) && ge.exec(rt.css(n.elem, t))
        , a = 1
        , l = 20;
      if (s && s[3] !== o) {
        o = o || s[3],
        r = r || [],
        s = +i || 1;
        do
          a = a || ".5",
          s /= a,
          rt.style(n.elem, t, s + o);
        while (a !== (a = n.cur() / i) && 1 !== a && --l)
      }
      return r && (s = n.start = +s || +i || 0,
      n.unit = o,
      n.end = r[1] ? s + (r[1] + 1) * r[2] : +r[2]),
      n
    }
    ]
  };
  rt.Animation = rt.extend(I, {
    tweener: function(t, e) {
      rt.isFunction(t) ? (e = t,
      t = ["*"]) : t = t.split(" ");
      for (var n, i = 0, r = t.length; r > i; i++)
        n = t[i],
        be[n] = be[n] || [],
        be[n].unshift(e)
    },
    prefilter: function(t, e) {
      e ? ye.unshift(t) : ye.push(t)
    }
  }),
  rt.speed = function(t, e, n) {
    var i = t && "object" == typeof t ? rt.extend({}, t) : {
      complete: n || !n && e || rt.isFunction(t) && t,
      duration: t,
      easing: n && e || e && !rt.isFunction(e) && e
    };
    return i.duration = rt.fx.off ? 0 : "number" == typeof i.duration ? i.duration : i.duration in rt.fx.speeds ? rt.fx.speeds[i.duration] : rt.fx.speeds._default,
    (null == i.queue || i.queue === !0) && (i.queue = "fx"),
    i.old = i.complete,
    i.complete = function() {
      rt.isFunction(i.old) && i.old.call(this),
      i.queue && rt.dequeue(this, i.queue)
    }
    ,
    i
  }
  ,
  rt.fn.extend({
    fadeTo: function(t, e, n, i) {
      return this.filter(Dt).css("opacity", 0).show().end().animate({
        opacity: e
      }, t, n, i)
    },
    animate: function(t, e, n, i) {
      var r = rt.isEmptyObject(t)
        , o = rt.speed(e, n, i)
        , s = function() {
        var e = I(this, rt.extend({}, t), o);
        (r || rt._data(this, "finish")) && e.stop(!0)
      };
      return s.finish = s,
      r || o.queue === !1 ? this.each(s) : this.queue(o.queue, s)
    },
    stop: function(t, e, n) {
      var i = function(t) {
        var e = t.stop;
        delete t.stop,
        e(n)
      };
      return "string" != typeof t && (n = e,
      e = t,
      t = void 0),
      e && t !== !1 && this.queue(t || "fx", []),
      this.each(function() {
        var e = !0
          , r = null != t && t + "queueHooks"
          , o = rt.timers
          , s = rt._data(this);
        if (r)
          s[r] && s[r].stop && i(s[r]);
        else
          for (r in s)
            s[r] && s[r].stop && ve.test(r) && i(s[r]);
        for (r = o.length; r--; )
          o[r].elem !== this || null != t && o[r].queue !== t || (o[r].anim.stop(n),
          e = !1,
          o.splice(r, 1));
        (e || !n) && rt.dequeue(this, t)
      })
    },
    finish: function(t) {
      return t !== !1 && (t = t || "fx"),
      this.each(function() {
        var e, n = rt._data(this), i = n[t + "queue"], r = n[t + "queueHooks"], o = rt.timers, s = i ? i.length : 0;
        for (n.finish = !0,
        rt.queue(this, t, []),
        r && r.stop && r.stop.call(this, !0),
        e = o.length; e--; )
          o[e].elem === this && o[e].queue === t && (o[e].anim.stop(!0),
          o.splice(e, 1));
        for (e = 0; s > e; e++)
          i[e] && i[e].finish && i[e].finish.call(this);
        delete n.finish
      })
    }
  }),
  rt.each(["toggle", "show", "hide"], function(t, e) {
    var n = rt.fn[e];
    rt.fn[e] = function(t, i, r) {
      return null == t || "boolean" == typeof t ? n.apply(this, arguments) : this.animate(M(e, !0), t, i, r)
    }
  }),
  rt.each({
    slideDown: M("show"),
    slideUp: M("hide"),
    slideToggle: M("toggle"),
    fadeIn: {
      opacity: "show"
    },
    fadeOut: {
      opacity: "hide"
    },
    fadeToggle: {
      opacity: "toggle"
    }
  }, function(t, e) {
    rt.fn[t] = function(t, n, i) {
      return this.animate(e, t, n, i)
    }
  }),
  rt.timers = [],
  rt.fx.tick = function() {
    var t, e = rt.timers, n = 0;
    for (fe = rt.now(); n < e.length; n++)
      t = e[n],
      t() || e[n] !== t || e.splice(n--, 1);
    e.length || rt.fx.stop(),
    fe = void 0
  }
  ,
  rt.fx.timer = function(t) {
    rt.timers.push(t),
    t() ? rt.fx.start() : rt.timers.pop()
  }
  ,
  rt.fx.interval = 13,
  rt.fx.start = function() {
    pe || (pe = setInterval(rt.fx.tick, rt.fx.interval))
  }
  ,
  rt.fx.stop = function() {
    clearInterval(pe),
    pe = null
  }
  ,
  rt.fx.speeds = {
    slow: 600,
    fast: 200,
    _default: 400
  },
  rt.fn.delay = function(t, e) {
    return t = rt.fx ? rt.fx.speeds[t] || t : t,
    e = e || "fx",
    this.queue(e, function(e, n) {
      var i = setTimeout(e, t);
      n.stop = function() {
        clearTimeout(i)
      }
    })
  }
  ,
  function() {
    var t, e, n, i, r;
    e = pt.createElement("div"),
    e.setAttribute("className", "t"),
    e.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",
    i = e.getElementsByTagName("a")[0],
    n = pt.createElement("select"),
    r = n.appendChild(pt.createElement("option")),
    t = e.getElementsByTagName("input")[0],
    i.style.cssText = "top:1px",
    nt.getSetAttribute = "t" !== e.className,
    nt.style = /top/.test(i.getAttribute("style")),
    nt.hrefNormalized = "/a" === i.getAttribute("href"),
    nt.checkOn = !!t.value,
    nt.optSelected = r.selected,
    nt.enctype = !!pt.createElement("form").enctype,
    n.disabled = !0,
    nt.optDisabled = !r.disabled,
    t = pt.createElement("input"),
    t.setAttribute("value", ""),
    nt.input = "" === t.getAttribute("value"),
    t.value = "t",
    t.setAttribute("type", "radio"),
    nt.radioValue = "t" === t.value
  }();
  var _e = /\r/g;
  rt.fn.extend({
    val: function(t) {
      var e, n, i, r = this[0];
      return arguments.length ? (i = rt.isFunction(t),
      this.each(function(n) {
        var r;
        1 === this.nodeType && (r = i ? t.call(this, n, rt(this).val()) : t,
        null == r ? r = "" : "number" == typeof r ? r += "" : rt.isArray(r) && (r = rt.map(r, function(t) {
          return null == t ? "" : t + ""
        })),
        e = rt.valHooks[this.type] || rt.valHooks[this.nodeName.toLowerCase()],
        e && "set"in e && void 0 !== e.set(this, r, "value") || (this.value = r))
      })) : r ? (e = rt.valHooks[r.type] || rt.valHooks[r.nodeName.toLowerCase()],
      e && "get"in e && void 0 !== (n = e.get(r, "value")) ? n : (n = r.value,
      "string" == typeof n ? n.replace(_e, "") : null == n ? "" : n)) : void 0
    }
  }),
  rt.extend({
    valHooks: {
      option: {
        get: function(t) {
          var e = rt.find.attr(t, "value");
          return null != e ? e : rt.trim(rt.text(t))
        }
      },
      select: {
        get: function(t) {
          for (var e, n, i = t.options, r = t.selectedIndex, o = "select-one" === t.type || 0 > r, s = o ? null : [], a = o ? r + 1 : i.length, l = 0 > r ? a : o ? r : 0; a > l; l++)
            if (n = i[l],
            !(!n.selected && l !== r || (nt.optDisabled ? n.disabled : null !== n.getAttribute("disabled")) || n.parentNode.disabled && rt.nodeName(n.parentNode, "optgroup"))) {
              if (e = rt(n).val(),
              o)
                return e;
              s.push(e)
            }
          return s
        },
        set: function(t, e) {
          for (var n, i, r = t.options, o = rt.makeArray(e), s = r.length; s--; )
            if (i = r[s],
            rt.inArray(rt.valHooks.option.get(i), o) >= 0)
              try {
                i.selected = n = !0
              } catch (a) {
                i.scrollHeight
              }
            else
              i.selected = !1;
          return n || (t.selectedIndex = -1),
          r
        }
      }
    }
  }),
  rt.each(["radio", "checkbox"], function() {
    rt.valHooks[this] = {
      set: function(t, e) {
        return rt.isArray(e) ? t.checked = rt.inArray(rt(t).val(), e) >= 0 : void 0
      }
    },
    nt.checkOn || (rt.valHooks[this].get = function(t) {
      return null === t.getAttribute("value") ? "on" : t.value
    }
    )
  });
  var we, xe, ke = rt.expr.attrHandle, Ce = /^(?:checked|selected)$/i, Te = nt.getSetAttribute, $e = nt.input;
  rt.fn.extend({
    attr: function(t, e) {
      return Et(this, rt.attr, t, e, arguments.length > 1)
    },
    removeAttr: function(t) {
      return this.each(function() {
        rt.removeAttr(this, t)
      })
    }
  }),
  rt.extend({
    attr: function(t, e, n) {
      var i, r, o = t.nodeType;
      return t && 3 !== o && 8 !== o && 2 !== o ? typeof t.getAttribute === kt ? rt.prop(t, e, n) : (1 === o && rt.isXMLDoc(t) || (e = e.toLowerCase(),
      i = rt.attrHooks[e] || (rt.expr.match.bool.test(e) ? xe : we)),
      void 0 === n ? i && "get"in i && null !== (r = i.get(t, e)) ? r : (r = rt.find.attr(t, e),
      null == r ? void 0 : r) : null !== n ? i && "set"in i && void 0 !== (r = i.set(t, n, e)) ? r : (t.setAttribute(e, n + ""),
      n) : void rt.removeAttr(t, e)) : void 0
    },
    removeAttr: function(t, e) {
      var n, i, r = 0, o = e && e.match(bt);
      if (o && 1 === t.nodeType)
        for (; n = o[r++]; )
          i = rt.propFix[n] || n,
          rt.expr.match.bool.test(n) ? $e && Te || !Ce.test(n) ? t[i] = !1 : t[rt.camelCase("default-" + n)] = t[i] = !1 : rt.attr(t, n, ""),
          t.removeAttribute(Te ? n : i)
    },
    attrHooks: {
      type: {
        set: function(t, e) {
          if (!nt.radioValue && "radio" === e && rt.nodeName(t, "input")) {
            var n = t.value;
            return t.setAttribute("type", e),
            n && (t.value = n),
            e
          }
        }
      }
    }
  }),
  xe = {
    set: function(t, e, n) {
      return e === !1 ? rt.removeAttr(t, n) : $e && Te || !Ce.test(n) ? t.setAttribute(!Te && rt.propFix[n] || n, n) : t[rt.camelCase("default-" + n)] = t[n] = !0,
      n
    }
  },
  rt.each(rt.expr.match.bool.source.match(/\w+/g), function(t, e) {
    var n = ke[e] || rt.find.attr;
    ke[e] = $e && Te || !Ce.test(e) ? function(t, e, i) {
      var r, o;
      return i || (o = ke[e],
      ke[e] = r,
      r = null != n(t, e, i) ? e.toLowerCase() : null,
      ke[e] = o),
      r
    }
    : function(t, e, n) {
      return n ? void 0 : t[rt.camelCase("default-" + e)] ? e.toLowerCase() : null
    }
  }),
  $e && Te || (rt.attrHooks.value = {
    set: function(t, e, n) {
      return rt.nodeName(t, "input") ? void (t.defaultValue = e) : we && we.set(t, e, n)
    }
  }),
  Te || (we = {
    set: function(t, e, n) {
      var i = t.getAttributeNode(n);
      return i || t.setAttributeNode(i = t.ownerDocument.createAttribute(n)),
      i.value = e += "",
      "value" === n || e === t.getAttribute(n) ? e : void 0
    }
  },
  ke.id = ke.name = ke.coords = function(t, e, n) {
    var i;
    return n ? void 0 : (i = t.getAttributeNode(e)) && "" !== i.value ? i.value : null
  }
  ,
  rt.valHooks.button = {
    get: function(t, e) {
      var n = t.getAttributeNode(e);
      return n && n.specified ? n.value : void 0
    },
    set: we.set
  },
  rt.attrHooks.contenteditable = {
    set: function(t, e, n) {
      we.set(t, "" === e ? !1 : e, n)
    }
  },
  rt.each(["width", "height"], function(t, e) {
    rt.attrHooks[e] = {
      set: function(t, n) {
        return "" === n ? (t.setAttribute(e, "auto"),
        n) : void 0
      }
    }
  })),
  nt.style || (rt.attrHooks.style = {
    get: function(t) {
      return t.style.cssText || void 0
    },
    set: function(t, e) {
      return t.style.cssText = e + ""
    }
  });
  var Se = /^(?:input|select|textarea|button|object)$/i
    , De = /^(?:a|area)$/i;
  rt.fn.extend({
    prop: function(t, e) {
      return Et(this, rt.prop, t, e, arguments.length > 1)
    },
    removeProp: function(t) {
      return t = rt.propFix[t] || t,
      this.each(function() {
        try {
          this[t] = void 0,
          delete this[t]
        } catch (e) {}
      })
    }
  }),
  rt.extend({
    propFix: {
      "for": "htmlFor",
      "class": "className"
    },
    prop: function(t, e, n) {
      var i, r, o, s = t.nodeType;
      return t && 3 !== s && 8 !== s && 2 !== s ? (o = 1 !== s || !rt.isXMLDoc(t),
      o && (e = rt.propFix[e] || e,
      r = rt.propHooks[e]),
      void 0 !== n ? r && "set"in r && void 0 !== (i = r.set(t, n, e)) ? i : t[e] = n : r && "get"in r && null !== (i = r.get(t, e)) ? i : t[e]) : void 0
    },
    propHooks: {
      tabIndex: {
        get: function(t) {
          var e = rt.find.attr(t, "tabindex");
          return e ? parseInt(e, 10) : Se.test(t.nodeName) || De.test(t.nodeName) && t.href ? 0 : -1
        }
      }
    }
  }),
  nt.hrefNormalized || rt.each(["href", "src"], function(t, e) {
    rt.propHooks[e] = {
      get: function(t) {
        return t.getAttribute(e, 4)
      }
    }
  }),
  nt.optSelected || (rt.propHooks.selected = {
    get: function(t) {
      var e = t.parentNode;
      return e && (e.selectedIndex,
      e.parentNode && e.parentNode.selectedIndex),
      null
    }
  }),
  rt.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
    rt.propFix[this.toLowerCase()] = this
  }),
  nt.enctype || (rt.propFix.enctype = "encoding");
  var Ee = /[\t\r\n\f]/g;
  rt.fn.extend({
    addClass: function(t) {
      var e, n, i, r, o, s, a = 0, l = this.length, u = "string" == typeof t && t;
      if (rt.isFunction(t))
        return this.each(function(e) {
          rt(this).addClass(t.call(this, e, this.className))
        });
      if (u)
        for (e = (t || "").match(bt) || []; l > a; a++)
          if (n = this[a],
          i = 1 === n.nodeType && (n.className ? (" " + n.className + " ").replace(Ee, " ") : " ")) {
            for (o = 0; r = e[o++]; )
              i.indexOf(" " + r + " ") < 0 && (i += r + " ");
            s = rt.trim(i),
            n.className !== s && (n.className = s)
          }
      return this
    },
    removeClass: function(t) {
      var e, n, i, r, o, s, a = 0, l = this.length, u = 0 === arguments.length || "string" == typeof t && t;
      if (rt.isFunction(t))
        return this.each(function(e) {
          rt(this).removeClass(t.call(this, e, this.className))
        });
      if (u)
        for (e = (t || "").match(bt) || []; l > a; a++)
          if (n = this[a],
          i = 1 === n.nodeType && (n.className ? (" " + n.className + " ").replace(Ee, " ") : "")) {
            for (o = 0; r = e[o++]; )
              for (; i.indexOf(" " + r + " ") >= 0; )
                i = i.replace(" " + r + " ", " ");
            s = t ? rt.trim(i) : "",
            n.className !== s && (n.className = s)
          }
      return this
    },
    toggleClass: function(t, e) {
      var n = typeof t;
      return "boolean" == typeof e && "string" === n ? e ? this.addClass(t) : this.removeClass(t) : this.each(rt.isFunction(t) ? function(n) {
        rt(this).toggleClass(t.call(this, n, this.className, e), e)
      }
      : function() {
        if ("string" === n)
          for (var e, i = 0, r = rt(this), o = t.match(bt) || []; e = o[i++]; )
            r.hasClass(e) ? r.removeClass(e) : r.addClass(e);
        else
          (n === kt || "boolean" === n) && (this.className && rt._data(this, "__className__", this.className),
          this.className = this.className || t === !1 ? "" : rt._data(this, "__className__") || "")
      }
      )
    },
    hasClass: function(t) {
      for (var e = " " + t + " ", n = 0, i = this.length; i > n; n++)
        if (1 === this[n].nodeType && (" " + this[n].className + " ").replace(Ee, " ").indexOf(e) >= 0)
          return !0;
      return !1
    }
  }),
  rt.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function(t, e) {
    rt.fn[e] = function(t, n) {
      return arguments.length > 0 ? this.on(e, null, t, n) : this.trigger(e)
    }
  }),
  rt.fn.extend({
    hover: function(t, e) {
      return this.mouseenter(t).mouseleave(e || t)
    },
    bind: function(t, e, n) {
      return this.on(t, null, e, n)
    },
    unbind: function(t, e) {
      return this.off(t, null, e)
    },
    delegate: function(t, e, n, i) {
      return this.on(e, t, n, i)
    },
    undelegate: function(t, e, n) {
      return 1 === arguments.length ? this.off(t, "**") : this.off(e, t || "**", n)
    }
  });
  var Oe = rt.now()
    , Ae = /\?/
    , Ne = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;
  rt.parseJSON = function(e) {
    if (t.JSON && t.JSON.parse)
      return t.JSON.parse(e + "");
    var n, i = null, r = rt.trim(e + "");
    return r && !rt.trim(r.replace(Ne, function(t, e, r, o) {
      return n && e && (i = 0),
      0 === i ? t : (n = r || e,
      i += !o - !r,
      "")
    })) ? Function("return " + r)() : rt.error("Invalid JSON: " + e)
  }
  ,
  rt.parseXML = function(e) {
    var n, i;
    if (!e || "string" != typeof e)
      return null;
    try {
      t.DOMParser ? (i = new DOMParser,
      n = i.parseFromString(e, "text/xml")) : (n = new ActiveXObject("Microsoft.XMLDOM"),
      n.async = "false",
      n.loadXML(e))
    } catch (r) {
      n = void 0
    }
    return n && n.documentElement && !n.getElementsByTagName("parsererror").length || rt.error("Invalid XML: " + e),
    n
  }
  ;
  var je, Me, Le = /#.*$/, Pe = /([?&])_=[^&]*/, Fe = /^(.*?):[ \t]*([^\r\n]*)\r?$/gm, Ie = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/, He = /^(?:GET|HEAD)$/, Re = /^\/\//, We = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/, Ye = {}, qe = {}, Ue = "*/".concat("*");
  try {
    Me = location.href
  } catch (Be) {
    Me = pt.createElement("a"),
    Me.href = "",
    Me = Me.href
  }
  je = We.exec(Me.toLowerCase()) || [],
  rt.extend({
    active: 0,
    lastModified: {},
    etag: {},
    ajaxSettings: {
      url: Me,
      type: "GET",
      isLocal: Ie.test(je[1]),
      global: !0,
      processData: !0,
      async: !0,
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      accepts: {
        "*": Ue,
        text: "text/plain",
        html: "text/html",
        xml: "application/xml, text/xml",
        json: "application/json, text/javascript"
      },
      contents: {
        xml: /xml/,
        html: /html/,
        json: /json/
      },
      responseFields: {
        xml: "responseXML",
        text: "responseText",
        json: "responseJSON"
      },
      converters: {
        "* text": String,
        "text html": !0,
        "text json": rt.parseJSON,
        "text xml": rt.parseXML
      },
      flatOptions: {
        url: !0,
        context: !0
      }
    },
    ajaxSetup: function(t, e) {
      return e ? W(W(t, rt.ajaxSettings), e) : W(rt.ajaxSettings, t)
    },
    ajaxPrefilter: H(Ye),
    ajaxTransport: H(qe),
    ajax: function(t, e) {
      function n(t, e, n, i) {
        var r, c, v, y, _, x = e;
        2 !== b && (b = 2,
        a && clearTimeout(a),
        u = void 0,
        s = i || "",
        w.readyState = t > 0 ? 4 : 0,
        r = t >= 200 && 300 > t || 304 === t,
        n && (y = Y(h, w, n)),
        y = q(h, y, w, r),
        r ? (h.ifModified && (_ = w.getResponseHeader("Last-Modified"),
        _ && (rt.lastModified[o] = _),
        _ = w.getResponseHeader("etag"),
        _ && (rt.etag[o] = _)),
        204 === t || "HEAD" === h.type ? x = "nocontent" : 304 === t ? x = "notmodified" : (x = y.state,
        c = y.data,
        v = y.error,
        r = !v)) : (v = x,
        (t || !x) && (x = "error",
        0 > t && (t = 0))),
        w.status = t,
        w.statusText = (e || x) + "",
        r ? p.resolveWith(d, [c, x, w]) : p.rejectWith(d, [w, x, v]),
        w.statusCode(g),
        g = void 0,
        l && f.trigger(r ? "ajaxSuccess" : "ajaxError", [w, h, r ? c : v]),
        m.fireWith(d, [w, x]),
        l && (f.trigger("ajaxComplete", [w, h]),
        --rt.active || rt.event.trigger("ajaxStop")))
      }
      "object" == typeof t && (e = t,
      t = void 0),
      e = e || {};
      var i, r, o, s, a, l, u, c, h = rt.ajaxSetup({}, e), d = h.context || h, f = h.context && (d.nodeType || d.jquery) ? rt(d) : rt.event, p = rt.Deferred(), m = rt.Callbacks("once memory"), g = h.statusCode || {}, v = {}, y = {}, b = 0, _ = "canceled", w = {
        readyState: 0,
        getResponseHeader: function(t) {
          var e;
          if (2 === b) {
            if (!c)
              for (c = {}; e = Fe.exec(s); )
                c[e[1].toLowerCase()] = e[2];
            e = c[t.toLowerCase()]
          }
          return null == e ? null : e
        },
        getAllResponseHeaders: function() {
          return 2 === b ? s : null
        },
        setRequestHeader: function(t, e) {
          var n = t.toLowerCase();
          return b || (t = y[n] = y[n] || t,
          v[t] = e),
          this
        },
        overrideMimeType: function(t) {
          return b || (h.mimeType = t),
          this
        },
        statusCode: function(t) {
          var e;
          if (t)
            if (2 > b)
              for (e in t)
                g[e] = [g[e], t[e]];
            else
              w.always(t[w.status]);
          return this
        },
        abort: function(t) {
          var e = t || _;
          return u && u.abort(e),
          n(0, e),
          this
        }
      };
      if (p.promise(w).complete = m.add,
      w.success = w.done,
      w.error = w.fail,
      h.url = ((t || h.url || Me) + "").replace(Le, "").replace(Re, je[1] + "//"),
      h.type = e.method || e.type || h.method || h.type,
      h.dataTypes = rt.trim(h.dataType || "*").toLowerCase().match(bt) || [""],
      null == h.crossDomain && (i = We.exec(h.url.toLowerCase()),
      h.crossDomain = !(!i || i[1] === je[1] && i[2] === je[2] && (i[3] || ("http:" === i[1] ? "80" : "443")) === (je[3] || ("http:" === je[1] ? "80" : "443")))),
      h.data && h.processData && "string" != typeof h.data && (h.data = rt.param(h.data, h.traditional)),
      R(Ye, h, e, w),
      2 === b)
        return w;
      l = rt.event && h.global,
      l && 0 === rt.active++ && rt.event.trigger("ajaxStart"),
      h.type = h.type.toUpperCase(),
      h.hasContent = !He.test(h.type),
      o = h.url,
      h.hasContent || (h.data && (o = h.url += (Ae.test(o) ? "&" : "?") + h.data,
      delete h.data),
      h.cache === !1 && (h.url = Pe.test(o) ? o.replace(Pe, "$1_=" + Oe++) : o + (Ae.test(o) ? "&" : "?") + "_=" + Oe++)),
      h.ifModified && (rt.lastModified[o] && w.setRequestHeader("If-Modified-Since", rt.lastModified[o]),
      rt.etag[o] && w.setRequestHeader("If-None-Match", rt.etag[o])),
      (h.data && h.hasContent && h.contentType !== !1 || e.contentType) && w.setRequestHeader("Content-Type", h.contentType),
      w.setRequestHeader("Accept", h.dataTypes[0] && h.accepts[h.dataTypes[0]] ? h.accepts[h.dataTypes[0]] + ("*" !== h.dataTypes[0] ? ", " + Ue + "; q=0.01" : "") : h.accepts["*"]);
      for (r in h.headers)
        w.setRequestHeader(r, h.headers[r]);
      if (h.beforeSend && (h.beforeSend.call(d, w, h) === !1 || 2 === b))
        return w.abort();
      _ = "abort";
      for (r in {
        success: 1,
        error: 1,
        complete: 1
      })
        w[r](h[r]);
      if (u = R(qe, h, e, w)) {
        w.readyState = 1,
        l && f.trigger("ajaxSend", [w, h]),
        h.async && h.timeout > 0 && (a = setTimeout(function() {
          w.abort("timeout")
        }, h.timeout));
        try {
          b = 1,
          u.send(v, n)
        } catch (x) {
          if (!(2 > b))
            throw x;
          n(-1, x)
        }
      } else
        n(-1, "No Transport");
      return w
    },
    getJSON: function(t, e, n) {
      return rt.get(t, e, n, "json")
    },
    getScript: function(t, e) {
      return rt.get(t, void 0, e, "script")
    }
  }),
  rt.each(["get", "post"], function(t, e) {
    rt[e] = function(t, n, i, r) {
      return rt.isFunction(n) && (r = r || i,
      i = n,
      n = void 0),
      rt.ajax({
        url: t,
        type: e,
        dataType: r,
        data: n,
        success: i
      })
    }
  }),
  rt._evalUrl = function(t) {
    return rt.ajax({
      url: t,
      type: "GET",
      dataType: "script",
      async: !1,
      global: !1,
      "throws": !0
    })
  }
  ,
  rt.fn.extend({
    wrapAll: function(t) {
      if (rt.isFunction(t))
        return this.each(function(e) {
          rt(this).wrapAll(t.call(this, e))
        });
      if (this[0]) {
        var e = rt(t, this[0].ownerDocument).eq(0).clone(!0);
        this[0].parentNode && e.insertBefore(this[0]),
        e.map(function() {
          for (var t = this; t.firstChild && 1 === t.firstChild.nodeType; )
            t = t.firstChild;
          return t
        }).append(this)
      }
      return this
    },
    wrapInner: function(t) {
      return this.each(rt.isFunction(t) ? function(e) {
        rt(this).wrapInner(t.call(this, e))
      }
      : function() {
        var e = rt(this)
          , n = e.contents();
        n.length ? n.wrapAll(t) : e.append(t)
      }
      )
    },
    wrap: function(t) {
      var e = rt.isFunction(t);
      return this.each(function(n) {
        rt(this).wrapAll(e ? t.call(this, n) : t)
      })
    },
    unwrap: function() {
      return this.parent().each(function() {
        rt.nodeName(this, "body") || rt(this).replaceWith(this.childNodes)
      }).end()
    }
  }),
  rt.expr.filters.hidden = function(t) {
    return t.offsetWidth <= 0 && t.offsetHeight <= 0 || !nt.reliableHiddenOffsets() && "none" === (t.style && t.style.display || rt.css(t, "display"))
  }
  ,
  rt.expr.filters.visible = function(t) {
    return !rt.expr.filters.hidden(t)
  }
  ;
  var Ve = /%20/g
    , ze = /\[\]$/
    , Ge = /\r?\n/g
    , Xe = /^(?:submit|button|image|reset|file)$/i
    , Je = /^(?:input|select|textarea|keygen)/i;
  rt.param = function(t, e) {
    var n, i = [], r = function(t, e) {
      e = rt.isFunction(e) ? e() : null == e ? "" : e,
      i[i.length] = encodeURIComponent(t) + "=" + encodeURIComponent(e)
    };
    if (void 0 === e && (e = rt.ajaxSettings && rt.ajaxSettings.traditional),
    rt.isArray(t) || t.jquery && !rt.isPlainObject(t))
      rt.each(t, function() {
        r(this.name, this.value)
      });
    else
      for (n in t)
        U(n, t[n], e, r);
    return i.join("&").replace(Ve, "+")
  }
  ,
  rt.fn.extend({
    serialize: function() {
      return rt.param(this.serializeArray())
    },
    serializeArray: function() {
      return this.map(function() {
        var t = rt.prop(this, "elements");
        return t ? rt.makeArray(t) : this
      }).filter(function() {
        var t = this.type;
        return this.name && !rt(this).is(":disabled") && Je.test(this.nodeName) && !Xe.test(t) && (this.checked || !Ot.test(t))
      }).map(function(t, e) {
        var n = rt(this).val();
        return null == n ? null : rt.isArray(n) ? rt.map(n, function(t) {
          return {
            name: e.name,
            value: t.replace(Ge, "\r\n")
          }
        }) : {
          name: e.name,
          value: n.replace(Ge, "\r\n")
        }
      }).get()
    }
  }),
  rt.ajaxSettings.xhr = void 0 !== t.ActiveXObject ? function() {
    return !this.isLocal && /^(get|post|head|put|delete|options)$/i.test(this.type) && B() || V()
  }
  : B;
  var Qe = 0
    , Ze = {}
    , Ke = rt.ajaxSettings.xhr();
  t.attachEvent && t.attachEvent("onunload", function() {
    for (var t in Ze)
      Ze[t](void 0, !0)
  }),
  nt.cors = !!Ke && "withCredentials"in Ke,
  Ke = nt.ajax = !!Ke,
  Ke && rt.ajaxTransport(function(t) {
    if (!t.crossDomain || nt.cors) {
      var e;
      return {
        send: function(n, i) {
          var r, o = t.xhr(), s = ++Qe;
          if (o.open(t.type, t.url, t.async, t.username, t.password),
          t.xhrFields)
            for (r in t.xhrFields)
              o[r] = t.xhrFields[r];
          t.mimeType && o.overrideMimeType && o.overrideMimeType(t.mimeType),
          t.crossDomain || n["X-Requested-With"] || (n["X-Requested-With"] = "XMLHttpRequest");
          for (r in n)
            void 0 !== n[r] && o.setRequestHeader(r, n[r] + "");
          o.send(t.hasContent && t.data || null),
          e = function(n, r) {
            var a, l, u;
            if (e && (r || 4 === o.readyState))
              if (delete Ze[s],
              e = void 0,
              o.onreadystatechange = rt.noop,
              r)
                4 !== o.readyState && o.abort();
              else {
                u = {},
                a = o.status,
                "string" == typeof o.responseText && (u.text = o.responseText);
                try {
                  l = o.statusText
                } catch (c) {
                  l = ""
                }
                a || !t.isLocal || t.crossDomain ? 1223 === a && (a = 204) : a = u.text ? 200 : 404
              }
            u && i(a, l, u, o.getAllResponseHeaders())
          }
          ,
          t.async ? 4 === o.readyState ? setTimeout(e) : o.onreadystatechange = Ze[s] = e : e()
        },
        abort: function() {
          e && e(void 0, !0)
        }
      }
    }
  }),
  rt.ajaxSetup({
    accepts: {
      script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
    },
    contents: {
      script: /(?:java|ecma)script/
    },
    converters: {
      "text script": function(t) {
        return rt.globalEval(t),
        t
      }
    }
  }),
  rt.ajaxPrefilter("script", function(t) {
    void 0 === t.cache && (t.cache = !1),
    t.crossDomain && (t.type = "GET",
    t.global = !1)
  }),
  rt.ajaxTransport("script", function(t) {
    if (t.crossDomain) {
      var e, n = pt.head || rt("head")[0] || pt.documentElement;
      return {
        send: function(i, r) {
          e = pt.createElement("script"),
          e.async = !0,
          t.scriptCharset && (e.charset = t.scriptCharset),
          e.src = t.url,
          e.onload = e.onreadystatechange = function(t, n) {
            (n || !e.readyState || /loaded|complete/.test(e.readyState)) && (e.onload = e.onreadystatechange = null,
            e.parentNode && e.parentNode.removeChild(e),
            e = null,
            n || r(200, "success"))
          }
          ,
          n.insertBefore(e, n.firstChild)
        },
        abort: function() {
          e && e.onload(void 0, !0)
        }
      }
    }
  });
  var tn = []
    , en = /(=)\?(?=&|$)|\?\?/;
  rt.ajaxSetup({
    jsonp: "callback",
    jsonpCallback: function() {
      var t = tn.pop() || rt.expando + "_" + Oe++;
      return this[t] = !0,
      t
    }
  }),
  rt.ajaxPrefilter("json jsonp", function(e, n, i) {
    var r, o, s, a = e.jsonp !== !1 && (en.test(e.url) ? "url" : "string" == typeof e.data && !(e.contentType || "").indexOf("application/x-www-form-urlencoded") && en.test(e.data) && "data");
    return a || "jsonp" === e.dataTypes[0] ? (r = e.jsonpCallback = rt.isFunction(e.jsonpCallback) ? e.jsonpCallback() : e.jsonpCallback,
    a ? e[a] = e[a].replace(en, "$1" + r) : e.jsonp !== !1 && (e.url += (Ae.test(e.url) ? "&" : "?") + e.jsonp + "=" + r),
    e.converters["script json"] = function() {
      return s || rt.error(r + " was not called"),
      s[0]
    }
    ,
    e.dataTypes[0] = "json",
    o = t[r],
    t[r] = function() {
      s = arguments
    }
    ,
    i.always(function() {
      t[r] = o,
      e[r] && (e.jsonpCallback = n.jsonpCallback,
      tn.push(r)),
      s && rt.isFunction(o) && o(s[0]),
      s = o = void 0
    }),
    "script") : void 0
  }),
  rt.parseHTML = function(t, e, n) {
    if (!t || "string" != typeof t)
      return null;
    "boolean" == typeof e && (n = e,
    e = !1),
    e = e || pt;
    var i = ht.exec(t)
      , r = !n && [];
    return i ? [e.createElement(i[1])] : (i = rt.buildFragment([t], e, r),
    r && r.length && rt(r).remove(),
    rt.merge([], i.childNodes))
  }
  ;
  var nn = rt.fn.load;
  rt.fn.load = function(t, e, n) {
    if ("string" != typeof t && nn)
      return nn.apply(this, arguments);
    var i, r, o, s = this, a = t.indexOf(" ");
    return a >= 0 && (i = rt.trim(t.slice(a, t.length)),
    t = t.slice(0, a)),
    rt.isFunction(e) ? (n = e,
    e = void 0) : e && "object" == typeof e && (o = "POST"),
    s.length > 0 && rt.ajax({
      url: t,
      type: o,
      dataType: "html",
      data: e
    }).done(function(t) {
      r = arguments,
      s.html(i ? rt("<div>").append(rt.parseHTML(t)).find(i) : t)
    }).complete(n && function(t, e) {
      s.each(n, r || [t.responseText, e, t])
    }
    ),
    this
  }
  ,
  rt.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(t, e) {
    rt.fn[e] = function(t) {
      return this.on(e, t)
    }
  }),
  rt.expr.filters.animated = function(t) {
    return rt.grep(rt.timers, function(e) {
      return t === e.elem
    }).length
  }
  ;
  var rn = t.document.documentElement;
  rt.offset = {
    setOffset: function(t, e, n) {
      var i, r, o, s, a, l, u, c = rt.css(t, "position"), h = rt(t), d = {};
      "static" === c && (t.style.position = "relative"),
      a = h.offset(),
      o = rt.css(t, "top"),
      l = rt.css(t, "left"),
      u = ("absolute" === c || "fixed" === c) && rt.inArray("auto", [o, l]) > -1,
      u ? (i = h.position(),
      s = i.top,
      r = i.left) : (s = parseFloat(o) || 0,
      r = parseFloat(l) || 0),
      rt.isFunction(e) && (e = e.call(t, n, a)),
      null != e.top && (d.top = e.top - a.top + s),
      null != e.left && (d.left = e.left - a.left + r),
      "using"in e ? e.using.call(t, d) : h.css(d)
    }
  },
  rt.fn.extend({
    offset: function(t) {
      if (arguments.length)
        return void 0 === t ? this : this.each(function(e) {
          rt.offset.setOffset(this, t, e)
        });
      var e, n, i = {
        top: 0,
        left: 0
      }, r = this[0], o = r && r.ownerDocument;
      return o ? (e = o.documentElement,
      rt.contains(e, r) ? (typeof r.getBoundingClientRect !== kt && (i = r.getBoundingClientRect()),
      n = z(o),
      {
        top: i.top + (n.pageYOffset || e.scrollTop) - (e.clientTop || 0),
        left: i.left + (n.pageXOffset || e.scrollLeft) - (e.clientLeft || 0)
      }) : i) : void 0
    },
    position: function() {
      if (this[0]) {
        var t, e, n = {
          top: 0,
          left: 0
        }, i = this[0];
        return "fixed" === rt.css(i, "position") ? e = i.getBoundingClientRect() : (t = this.offsetParent(),
        e = this.offset(),
        rt.nodeName(t[0], "html") || (n = t.offset()),
        n.top += rt.css(t[0], "borderTopWidth", !0),
        n.left += rt.css(t[0], "borderLeftWidth", !0)),
        {
          top: e.top - n.top - rt.css(i, "marginTop", !0),
          left: e.left - n.left - rt.css(i, "marginLeft", !0)
        }
      }
    },
    offsetParent: function() {
      return this.map(function() {
        for (var t = this.offsetParent || rn; t && !rt.nodeName(t, "html") && "static" === rt.css(t, "position"); )
          t = t.offsetParent;
        return t || rn
      })
    }
  }),
  rt.each({
    scrollLeft: "pageXOffset",
    scrollTop: "pageYOffset"
  }, function(t, e) {
    var n = /Y/.test(e);
    rt.fn[t] = function(i) {
      return Et(this, function(t, i, r) {
        var o = z(t);
        return void 0 === r ? o ? e in o ? o[e] : o.document.documentElement[i] : t[i] : void (o ? o.scrollTo(n ? rt(o).scrollLeft() : r, n ? r : rt(o).scrollTop()) : t[i] = r);
      }, t, i, arguments.length, null)
    }
  }),
  rt.each(["top", "left"], function(t, e) {
    rt.cssHooks[e] = $(nt.pixelPosition, function(t, n) {
      return n ? (n = ee(t, e),
      ie.test(n) ? rt(t).position()[e] + "px" : n) : void 0
    })
  }),
  rt.each({
    Height: "height",
    Width: "width"
  }, function(t, e) {
    rt.each({
      padding: "inner" + t,
      content: e,
      "": "outer" + t
    }, function(n, i) {
      rt.fn[i] = function(i, r) {
        var o = arguments.length && (n || "boolean" != typeof i)
          , s = n || (i === !0 || r === !0 ? "margin" : "border");
        return Et(this, function(e, n, i) {
          var r;
          return rt.isWindow(e) ? e.document.documentElement["client" + t] : 9 === e.nodeType ? (r = e.documentElement,
          Math.max(e.body["scroll" + t], r["scroll" + t], e.body["offset" + t], r["offset" + t], r["client" + t])) : void 0 === i ? rt.css(e, n, s) : rt.style(e, n, i, s)
        }, e, o ? i : void 0, o, null)
      }
    })
  }),
  rt.fn.size = function() {
    return this.length
  }
  ,
  rt.fn.andSelf = rt.fn.addBack,
  "function" == typeof define && define.amd && define("jquery", [], function() {
    return rt
  });
  var on = t.jQuery
    , sn = t.$;
  return rt.noConflict = function(e) {
    return t.$ === rt && (t.$ = sn),
    e && t.jQuery === rt && (t.jQuery = on),
    rt
  }
  ,
  typeof e === kt && (t.jQuery = t.$ = rt),
  rt
}),
"undefined" == typeof jQuery)
  throw new Error("Bootstrap's JavaScript requires jQuery");
+function(t) {
  "use strict";
  var e = t.fn.jquery.split(" ")[0].split(".");
  if (e[0] < 2 && e[1] < 9 || 1 == e[0] && 9 == e[1] && e[2] < 1)
    throw new Error("Bootstrap's JavaScript requires jQuery version 1.9.1 or higher")
}(jQuery),
+function(t) {
  "use strict";
  function e() {
    var t = document.createElement("bootstrap")
      , e = {
      WebkitTransition: "webkitTransitionEnd",
      MozTransition: "transitionend",
      OTransition: "oTransitionEnd otransitionend",
      transition: "transitionend"
    };
    for (var n in e)
      if (void 0 !== t.style[n])
        return {
          end: e[n]
        };
    return !1
  }
  t.fn.emulateTransitionEnd = function(e) {
    var n = !1
      , i = this;
    t(this).one("bsTransitionEnd", function() {
      n = !0
    });
    var r = function() {
      n || t(i).trigger(t.support.transition.end)
    };
    return setTimeout(r, e),
    this
  }
  ,
  t(function() {
    t.support.transition = e(),
    t.support.transition && (t.event.special.bsTransitionEnd = {
      bindType: t.support.transition.end,
      delegateType: t.support.transition.end,
      handle: function(e) {
        return t(e.target).is(this) ? e.handleObj.handler.apply(this, arguments) : void 0
      }
    })
  })
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    return this.each(function() {
      var n = t(this)
        , r = n.data("bs.alert");
      r || n.data("bs.alert", r = new i(this)),
      "string" == typeof e && r[e].call(n)
    })
  }
  var n = '[data-dismiss="alert"]'
    , i = function(e) {
    t(e).on("click", n, this.close)
  };
  i.VERSION = "3.3.5",
  i.TRANSITION_DURATION = 150,
  i.prototype.close = function(e) {
    function n() {
      s.detach().trigger("closed.bs.alert").remove()
    }
    var r = t(this)
      , o = r.attr("data-target");
    o || (o = r.attr("href"),
    o = o && o.replace(/.*(?=#[^\s]*$)/, ""));
    var s = t(o);
    e && e.preventDefault(),
    s.length || (s = r.closest(".alert")),
    s.trigger(e = t.Event("close.bs.alert")),
    e.isDefaultPrevented() || (s.removeClass("in"),
    t.support.transition && s.hasClass("fade") ? s.one("bsTransitionEnd", n).emulateTransitionEnd(i.TRANSITION_DURATION) : n())
  }
  ;
  var r = t.fn.alert;
  t.fn.alert = e,
  t.fn.alert.Constructor = i,
  t.fn.alert.noConflict = function() {
    return t.fn.alert = r,
    this
  }
  ,
  t(document).on("click.bs.alert.data-api", n, i.prototype.close)
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    return this.each(function() {
      var i = t(this)
        , r = i.data("bs.button")
        , o = "object" == typeof e && e;
      r || i.data("bs.button", r = new n(this,o)),
      "toggle" == e ? r.toggle() : e && r.setState(e)
    })
  }
  var n = function(e, i) {
    this.$element = t(e),
    this.options = t.extend({}, n.DEFAULTS, i),
    this.isLoading = !1
  };
  n.VERSION = "3.3.5",
  n.DEFAULTS = {
    loadingText: "loading..."
  },
  n.prototype.setState = function(e) {
    var n = "disabled"
      , i = this.$element
      , r = i.is("input") ? "val" : "html"
      , o = i.data();
    e += "Text",
    null == o.resetText && i.data("resetText", i[r]()),
    setTimeout(t.proxy(function() {
      i[r](null == o[e] ? this.options[e] : o[e]),
      "loadingText" == e ? (this.isLoading = !0,
      i.addClass(n).attr(n, n)) : this.isLoading && (this.isLoading = !1,
      i.removeClass(n).removeAttr(n))
    }, this), 0)
  }
  ,
  n.prototype.toggle = function() {
    var t = !0
      , e = this.$element.closest('[data-toggle="buttons"]');
    if (e.length) {
      var n = this.$element.find("input");
      "radio" == n.prop("type") ? (n.prop("checked") && (t = !1),
      e.find(".active").removeClass("active"),
      this.$element.addClass("active")) : "checkbox" == n.prop("type") && (n.prop("checked") !== this.$element.hasClass("active") && (t = !1),
      this.$element.toggleClass("active")),
      n.prop("checked", this.$element.hasClass("active")),
      t && n.trigger("change")
    } else
      this.$element.attr("aria-pressed", !this.$element.hasClass("active")),
      this.$element.toggleClass("active")
  }
  ;
  var i = t.fn.button;
  t.fn.button = e,
  t.fn.button.Constructor = n,
  t.fn.button.noConflict = function() {
    return t.fn.button = i,
    this
  }
  ,
  t(document).on("click.bs.button.data-api", '[data-toggle^="button"]', function(n) {
    var i = t(n.target);
    i.hasClass("btn") || (i = i.closest(".btn")),
    e.call(i, "toggle"),
    t(n.target).is('input[type="radio"]') || t(n.target).is('input[type="checkbox"]') || n.preventDefault()
  }).on("focus.bs.button.data-api blur.bs.button.data-api", '[data-toggle^="button"]', function(e) {
    t(e.target).closest(".btn").toggleClass("focus", /^focus(in)?$/.test(e.type))
  })
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    return this.each(function() {
      var i = t(this)
        , r = i.data("bs.carousel")
        , o = t.extend({}, n.DEFAULTS, i.data(), "object" == typeof e && e)
        , s = "string" == typeof e ? e : o.slide;
      r || i.data("bs.carousel", r = new n(this,o)),
      "number" == typeof e ? r.to(e) : s ? r[s]() : o.interval && r.pause().cycle()
    })
  }
  var n = function(e, n) {
    this.$element = t(e),
    this.$indicators = this.$element.find(".carousel-indicators"),
    this.options = n,
    this.paused = null,
    this.sliding = null,
    this.interval = null,
    this.$active = null,
    this.$items = null,
    this.options.keyboard && this.$element.on("keydown.bs.carousel", t.proxy(this.keydown, this)),
    "hover" == this.options.pause && !("ontouchstart"in document.documentElement) && this.$element.on("mouseenter.bs.carousel", t.proxy(this.pause, this)).on("mouseleave.bs.carousel", t.proxy(this.cycle, this))
  };
  n.VERSION = "3.3.5",
  n.TRANSITION_DURATION = 600,
  n.DEFAULTS = {
    interval: 5e3,
    pause: "hover",
    wrap: !0,
    keyboard: !0
  },
  n.prototype.keydown = function(t) {
    if (!/input|textarea/i.test(t.target.tagName)) {
      switch (t.which) {
      case 37:
        this.prev();
        break;
      case 39:
        this.next();
        break;
      default:
        return
      }
      t.preventDefault()
    }
  }
  ,
  n.prototype.cycle = function(e) {
    return e || (this.paused = !1),
    this.interval && clearInterval(this.interval),
    this.options.interval && !this.paused && (this.interval = setInterval(t.proxy(this.next, this), this.options.interval)),
    this
  }
  ,
  n.prototype.getItemIndex = function(t) {
    return this.$items = t.parent().children(".item"),
    this.$items.index(t || this.$active)
  }
  ,
  n.prototype.getItemForDirection = function(t, e) {
    var n = this.getItemIndex(e)
      , i = "prev" == t && 0 === n || "next" == t && n == this.$items.length - 1;
    if (i && !this.options.wrap)
      return e;
    var r = "prev" == t ? -1 : 1
      , o = (n + r) % this.$items.length;
    return this.$items.eq(o)
  }
  ,
  n.prototype.to = function(t) {
    var e = this
      , n = this.getItemIndex(this.$active = this.$element.find(".item.active"));
    return t > this.$items.length - 1 || 0 > t ? void 0 : this.sliding ? this.$element.one("slid.bs.carousel", function() {
      e.to(t)
    }) : n == t ? this.pause().cycle() : this.slide(t > n ? "next" : "prev", this.$items.eq(t))
  }
  ,
  n.prototype.pause = function(e) {
    return e || (this.paused = !0),
    this.$element.find(".next, .prev").length && t.support.transition && (this.$element.trigger(t.support.transition.end),
    this.cycle(!0)),
    this.interval = clearInterval(this.interval),
    this
  }
  ,
  n.prototype.next = function() {
    return this.sliding ? void 0 : this.slide("next")
  }
  ,
  n.prototype.prev = function() {
    return this.sliding ? void 0 : this.slide("prev")
  }
  ,
  n.prototype.slide = function(e, i) {
    var r = this.$element.find(".item.active")
      , o = i || this.getItemForDirection(e, r)
      , s = this.interval
      , a = "next" == e ? "left" : "right"
      , l = this;
    if (o.hasClass("active"))
      return this.sliding = !1;
    var u = o[0]
      , c = t.Event("slide.bs.carousel", {
      relatedTarget: u,
      direction: a
    });
    if (this.$element.trigger(c),
    !c.isDefaultPrevented()) {
      if (this.sliding = !0,
      s && this.pause(),
      this.$indicators.length) {
        this.$indicators.find(".active").removeClass("active");
        var h = t(this.$indicators.children()[this.getItemIndex(o)]);
        h && h.addClass("active")
      }
      var d = t.Event("slid.bs.carousel", {
        relatedTarget: u,
        direction: a
      });
      return t.support.transition && this.$element.hasClass("slide") ? (o.addClass(e),
      o[0].offsetWidth,
      r.addClass(a),
      o.addClass(a),
      r.one("bsTransitionEnd", function() {
        o.removeClass([e, a].join(" ")).addClass("active"),
        r.removeClass(["active", a].join(" ")),
        l.sliding = !1,
        setTimeout(function() {
          l.$element.trigger(d)
        }, 0)
      }).emulateTransitionEnd(n.TRANSITION_DURATION)) : (r.removeClass("active"),
      o.addClass("active"),
      this.sliding = !1,
      this.$element.trigger(d)),
      s && this.cycle(),
      this
    }
  }
  ;
  var i = t.fn.carousel;
  t.fn.carousel = e,
  t.fn.carousel.Constructor = n,
  t.fn.carousel.noConflict = function() {
    return t.fn.carousel = i,
    this
  }
  ;
  var r = function(n) {
    var i, r = t(this), o = t(r.attr("data-target") || (i = r.attr("href")) && i.replace(/.*(?=#[^\s]+$)/, ""));
    if (o.hasClass("carousel")) {
      var s = t.extend({}, o.data(), r.data())
        , a = r.attr("data-slide-to");
      a && (s.interval = !1),
      e.call(o, s),
      a && o.data("bs.carousel").to(a),
      n.preventDefault()
    }
  };
  t(document).on("click.bs.carousel.data-api", "[data-slide]", r).on("click.bs.carousel.data-api", "[data-slide-to]", r),
  t(window).on("load", function() {
    t('[data-ride="carousel"]').each(function() {
      var n = t(this);
      e.call(n, n.data())
    })
  })
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    var n, i = e.attr("data-target") || (n = e.attr("href")) && n.replace(/.*(?=#[^\s]+$)/, "");
    return t(i)
  }
  function n(e) {
    return this.each(function() {
      var n = t(this)
        , r = n.data("bs.collapse")
        , o = t.extend({}, i.DEFAULTS, n.data(), "object" == typeof e && e);
      !r && o.toggle && /show|hide/.test(e) && (o.toggle = !1),
      r || n.data("bs.collapse", r = new i(this,o)),
      "string" == typeof e && r[e]()
    })
  }
  var i = function(e, n) {
    this.$element = t(e),
    this.options = t.extend({}, i.DEFAULTS, n),
    this.$trigger = t('[data-toggle="collapse"][href="#' + e.id + '"],[data-toggle="collapse"][data-target="#' + e.id + '"]'),
    this.transitioning = null,
    this.options.parent ? this.$parent = this.getParent() : this.addAriaAndCollapsedClass(this.$element, this.$trigger),
    this.options.toggle && this.toggle()
  };
  i.VERSION = "3.3.5",
  i.TRANSITION_DURATION = 350,
  i.DEFAULTS = {
    toggle: !0
  },
  i.prototype.dimension = function() {
    var t = this.$element.hasClass("width");
    return t ? "width" : "height"
  }
  ,
  i.prototype.show = function() {
    if (!this.transitioning && !this.$element.hasClass("in")) {
      var e, r = this.$parent && this.$parent.children(".panel").children(".in, .collapsing");
      if (!(r && r.length && (e = r.data("bs.collapse"),
      e && e.transitioning))) {
        var o = t.Event("show.bs.collapse");
        if (this.$element.trigger(o),
        !o.isDefaultPrevented()) {
          r && r.length && (n.call(r, "hide"),
          e || r.data("bs.collapse", null));
          var s = this.dimension();
          this.$element.removeClass("collapse").addClass("collapsing")[s](0).attr("aria-expanded", !0),
          this.$trigger.removeClass("collapsed").attr("aria-expanded", !0),
          this.transitioning = 1;
          var a = function() {
            this.$element.removeClass("collapsing").addClass("collapse in")[s](""),
            this.transitioning = 0,
            this.$element.trigger("shown.bs.collapse")
          };
          if (!t.support.transition)
            return a.call(this);
          var l = t.camelCase(["scroll", s].join("-"));
          this.$element.one("bsTransitionEnd", t.proxy(a, this)).emulateTransitionEnd(i.TRANSITION_DURATION)[s](this.$element[0][l])
        }
      }
    }
  }
  ,
  i.prototype.hide = function() {
    if (!this.transitioning && this.$element.hasClass("in")) {
      var e = t.Event("hide.bs.collapse");
      if (this.$element.trigger(e),
      !e.isDefaultPrevented()) {
        var n = this.dimension();
        this.$element[n](this.$element[n]())[0].offsetHeight,
        this.$element.addClass("collapsing").removeClass("collapse in").attr("aria-expanded", !1),
        this.$trigger.addClass("collapsed").attr("aria-expanded", !1),
        this.transitioning = 1;
        var r = function() {
          this.transitioning = 0,
          this.$element.removeClass("collapsing").addClass("collapse").trigger("hidden.bs.collapse")
        };
        return t.support.transition ? void this.$element[n](0).one("bsTransitionEnd", t.proxy(r, this)).emulateTransitionEnd(i.TRANSITION_DURATION) : r.call(this)
      }
    }
  }
  ,
  i.prototype.toggle = function() {
    this[this.$element.hasClass("in") ? "hide" : "show"]()
  }
  ,
  i.prototype.getParent = function() {
    return t(this.options.parent).find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]').each(t.proxy(function(n, i) {
      var r = t(i);
      this.addAriaAndCollapsedClass(e(r), r)
    }, this)).end()
  }
  ,
  i.prototype.addAriaAndCollapsedClass = function(t, e) {
    var n = t.hasClass("in");
    t.attr("aria-expanded", n),
    e.toggleClass("collapsed", !n).attr("aria-expanded", n)
  }
  ;
  var r = t.fn.collapse;
  t.fn.collapse = n,
  t.fn.collapse.Constructor = i,
  t.fn.collapse.noConflict = function() {
    return t.fn.collapse = r,
    this
  }
  ,
  t(document).on("click.bs.collapse.data-api", '[data-toggle="collapse"]', function(i) {
    var r = t(this);
    r.attr("data-target") || i.preventDefault();
    var o = e(r)
      , s = o.data("bs.collapse")
      , a = s ? "toggle" : r.data();
    n.call(o, a)
  })
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    var n = e.attr("data-target");
    n || (n = e.attr("href"),
    n = n && /#[A-Za-z]/.test(n) && n.replace(/.*(?=#[^\s]*$)/, ""));
    var i = n && t(n);
    return i && i.length ? i : e.parent()
  }
  function n(n) {
    n && 3 === n.which || (t(r).remove(),
    t(o).each(function() {
      var i = t(this)
        , r = e(i)
        , o = {
        relatedTarget: this
      };
      r.hasClass("open") && (n && "click" == n.type && /input|textarea/i.test(n.target.tagName) && t.contains(r[0], n.target) || (r.trigger(n = t.Event("hide.bs.dropdown", o)),
      n.isDefaultPrevented() || (i.attr("aria-expanded", "false"),
      r.removeClass("open").trigger("hidden.bs.dropdown", o))))
    }))
  }
  function i(e) {
    return this.each(function() {
      var n = t(this)
        , i = n.data("bs.dropdown");
      i || n.data("bs.dropdown", i = new s(this)),
      "string" == typeof e && i[e].call(n)
    })
  }
  var r = ".dropdown-backdrop"
    , o = '[data-toggle="dropdown"]'
    , s = function(e) {
    t(e).on("click.bs.dropdown", this.toggle)
  };
  s.VERSION = "3.3.5",
  s.prototype.toggle = function(i) {
    var r = t(this);
    if (!r.is(".disabled, :disabled")) {
      var o = e(r)
        , s = o.hasClass("open");
      if (n(),
      !s) {
        "ontouchstart"in document.documentElement && !o.closest(".navbar-nav").length && t(document.createElement("div")).addClass("dropdown-backdrop").insertAfter(t(this)).on("click", n);
        var a = {
          relatedTarget: this
        };
        if (o.trigger(i = t.Event("show.bs.dropdown", a)),
        i.isDefaultPrevented())
          return;
        r.trigger("focus").attr("aria-expanded", "true"),
        o.toggleClass("open").trigger("shown.bs.dropdown", a)
      }
      return !1
    }
  }
  ,
  s.prototype.keydown = function(n) {
    if (/(38|40|27|32)/.test(n.which) && !/input|textarea/i.test(n.target.tagName)) {
      var i = t(this);
      if (n.preventDefault(),
      n.stopPropagation(),
      !i.is(".disabled, :disabled")) {
        var r = e(i)
          , s = r.hasClass("open");
        if (!s && 27 != n.which || s && 27 == n.which)
          return 27 == n.which && r.find(o).trigger("focus"),
          i.trigger("click");
        var a = " li:not(.disabled):visible a"
          , l = r.find(".dropdown-menu" + a);
        if (l.length) {
          var u = l.index(n.target);
          38 == n.which && u > 0 && u--,
          40 == n.which && u < l.length - 1 && u++,
          ~u || (u = 0),
          l.eq(u).trigger("focus")
        }
      }
    }
  }
  ;
  var a = t.fn.dropdown;
  t.fn.dropdown = i,
  t.fn.dropdown.Constructor = s,
  t.fn.dropdown.noConflict = function() {
    return t.fn.dropdown = a,
    this
  }
  ,
  t(document).on("click.bs.dropdown.data-api", n).on("click.bs.dropdown.data-api", ".dropdown form", function(t) {
    t.stopPropagation()
  }).on("click.bs.dropdown.data-api", o, s.prototype.toggle).on("keydown.bs.dropdown.data-api", o, s.prototype.keydown).on("keydown.bs.dropdown.data-api", ".dropdown-menu", s.prototype.keydown)
}(jQuery),
+function(t) {
  "use strict";
  function e(e, i) {
    return this.each(function() {
      var r = t(this)
        , o = r.data("bs.modal")
        , s = t.extend({}, n.DEFAULTS, r.data(), "object" == typeof e && e);
      o || r.data("bs.modal", o = new n(this,s)),
      "string" == typeof e ? o[e](i) : s.show && o.show(i)
    })
  }
  var n = function(e, n) {
    this.options = n,
    this.$body = t(document.body),
    this.$element = t(e),
    this.$dialog = this.$element.find(".modal-dialog"),
    this.$backdrop = null,
    this.isShown = null,
    this.originalBodyPad = null,
    this.scrollbarWidth = 0,
    this.ignoreBackdropClick = !1,
    this.options.remote && this.$element.find(".modal-content").load(this.options.remote, t.proxy(function() {
      this.$element.trigger("loaded.bs.modal")
    }, this))
  };
  n.VERSION = "3.3.5",
  n.TRANSITION_DURATION = 300,
  n.BACKDROP_TRANSITION_DURATION = 150,
  n.DEFAULTS = {
    backdrop: !0,
    keyboard: !0,
    show: !0
  },
  n.prototype.toggle = function(t) {
    return this.isShown ? this.hide() : this.show(t)
  }
  ,
  n.prototype.show = function(e) {
    var i = this
      , r = t.Event("show.bs.modal", {
      relatedTarget: e
    });
    this.$element.trigger(r),
    this.isShown || r.isDefaultPrevented() || (this.isShown = !0,
    this.checkScrollbar(),
    this.setScrollbar(),
    this.$body.addClass("modal-open"),
    this.escape(),
    this.resize(),
    this.$element.on("click.dismiss.bs.modal", '[data-dismiss="modal"]', t.proxy(this.hide, this)),
    this.$dialog.on("mousedown.dismiss.bs.modal", function() {
      i.$element.one("mouseup.dismiss.bs.modal", function(e) {
        t(e.target).is(i.$element) && (i.ignoreBackdropClick = !0)
      })
    }),
    this.backdrop(function() {
      var r = t.support.transition && i.$element.hasClass("fade");
      i.$element.parent().length || i.$element.appendTo(i.$body),
      i.$element.show().scrollTop(0),
      i.adjustDialog(),
      r && i.$element[0].offsetWidth,
      i.$element.addClass("in"),
      i.enforceFocus();
      var o = t.Event("shown.bs.modal", {
        relatedTarget: e
      });
      r ? i.$dialog.one("bsTransitionEnd", function() {
        i.$element.trigger("focus").trigger(o)
      }).emulateTransitionEnd(n.TRANSITION_DURATION) : i.$element.trigger("focus").trigger(o)
    }))
  }
  ,
  n.prototype.hide = function(e) {
    e && e.preventDefault(),
    e = t.Event("hide.bs.modal"),
    this.$element.trigger(e),
    this.isShown && !e.isDefaultPrevented() && (this.isShown = !1,
    this.escape(),
    this.resize(),
    t(document).off("focusin.bs.modal"),
    this.$element.removeClass("in").off("click.dismiss.bs.modal").off("mouseup.dismiss.bs.modal"),
    this.$dialog.off("mousedown.dismiss.bs.modal"),
    t.support.transition && this.$element.hasClass("fade") ? this.$element.one("bsTransitionEnd", t.proxy(this.hideModal, this)).emulateTransitionEnd(n.TRANSITION_DURATION) : this.hideModal())
  }
  ,
  n.prototype.enforceFocus = function() {
    t(document).off("focusin.bs.modal").on("focusin.bs.modal", t.proxy(function(t) {
      this.$element[0] === t.target || this.$element.has(t.target).length || this.$element.trigger("focus")
    }, this))
  }
  ,
  n.prototype.escape = function() {
    this.isShown && this.options.keyboard ? this.$element.on("keydown.dismiss.bs.modal", t.proxy(function(t) {
      27 == t.which && this.hide()
    }, this)) : this.isShown || this.$element.off("keydown.dismiss.bs.modal")
  }
  ,
  n.prototype.resize = function() {
    this.isShown ? t(window).on("resize.bs.modal", t.proxy(this.handleUpdate, this)) : t(window).off("resize.bs.modal")
  }
  ,
  n.prototype.hideModal = function() {
    var t = this;
    this.$element.hide(),
    this.backdrop(function() {
      t.$body.removeClass("modal-open"),
      t.resetAdjustments(),
      t.resetScrollbar(),
      t.$element.trigger("hidden.bs.modal")
    })
  }
  ,
  n.prototype.removeBackdrop = function() {
    this.$backdrop && this.$backdrop.remove(),
    this.$backdrop = null
  }
  ,
  n.prototype.backdrop = function(e) {
    var i = this
      , r = this.$element.hasClass("fade") ? "fade" : "";
    if (this.isShown && this.options.backdrop) {
      var o = t.support.transition && r;
      if (this.$backdrop = t(document.createElement("div")).addClass("modal-backdrop " + r).appendTo(this.$body),
      this.$element.on("click.dismiss.bs.modal", t.proxy(function(t) {
        return this.ignoreBackdropClick ? void (this.ignoreBackdropClick = !1) : void (t.target === t.currentTarget && ("static" == this.options.backdrop ? this.$element[0].focus() : this.hide()))
      }, this)),
      o && this.$backdrop[0].offsetWidth,
      this.$backdrop.addClass("in"),
      !e)
        return;
      o ? this.$backdrop.one("bsTransitionEnd", e).emulateTransitionEnd(n.BACKDROP_TRANSITION_DURATION) : e()
    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass("in");
      var s = function() {
        i.removeBackdrop(),
        e && e()
      };
      t.support.transition && this.$element.hasClass("fade") ? this.$backdrop.one("bsTransitionEnd", s).emulateTransitionEnd(n.BACKDROP_TRANSITION_DURATION) : s()
    } else
      e && e()
  }
  ,
  n.prototype.handleUpdate = function() {
    this.adjustDialog()
  }
  ,
  n.prototype.adjustDialog = function() {
    var t = this.$element[0].scrollHeight > document.documentElement.clientHeight;
    this.$element.css({
      paddingLeft: !this.bodyIsOverflowing && t ? this.scrollbarWidth : "",
      paddingRight: this.bodyIsOverflowing && !t ? this.scrollbarWidth : ""
    })
  }
  ,
  n.prototype.resetAdjustments = function() {
    this.$element.css({
      paddingLeft: "",
      paddingRight: ""
    })
  }
  ,
  n.prototype.checkScrollbar = function() {
    var t = window.innerWidth;
    if (!t) {
      var e = document.documentElement.getBoundingClientRect();
      t = e.right - Math.abs(e.left)
    }
    this.bodyIsOverflowing = document.body.clientWidth < t,
    this.scrollbarWidth = this.measureScrollbar()
  }
  ,
  n.prototype.setScrollbar = function() {
    var t = parseInt(this.$body.css("padding-right") || 0, 10);
    this.originalBodyPad = document.body.style.paddingRight || "",
    this.bodyIsOverflowing && this.$body.css("padding-right", t + this.scrollbarWidth)
  }
  ,
  n.prototype.resetScrollbar = function() {
    this.$body.css("padding-right", this.originalBodyPad)
  }
  ,
  n.prototype.measureScrollbar = function() {
    var t = document.createElement("div");
    t.className = "modal-scrollbar-measure",
    this.$body.append(t);
    var e = t.offsetWidth - t.clientWidth;
    return this.$body[0].removeChild(t),
    e
  }
  ;
  var i = t.fn.modal;
  t.fn.modal = e,
  t.fn.modal.Constructor = n,
  t.fn.modal.noConflict = function() {
    return t.fn.modal = i,
    this
  }
  ,
  t(document).on("click.bs.modal.data-api", '[data-toggle="modal"]', function(n) {
    var i = t(this)
      , r = i.attr("href")
      , o = t(i.attr("data-target") || r && r.replace(/.*(?=#[^\s]+$)/, ""))
      , s = o.data("bs.modal") ? "toggle" : t.extend({
      remote: !/#/.test(r) && r
    }, o.data(), i.data());
    i.is("a") && n.preventDefault(),
    o.one("show.bs.modal", function(t) {
      t.isDefaultPrevented() || o.one("hidden.bs.modal", function() {
        i.is(":visible") && i.trigger("focus")
      })
    }),
    e.call(o, s, this)
  })
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    return this.each(function() {
      var i = t(this)
        , r = i.data("bs.tooltip")
        , o = "object" == typeof e && e;
      (r || !/destroy|hide/.test(e)) && (r || i.data("bs.tooltip", r = new n(this,o)),
      "string" == typeof e && r[e]())
    })
  }
  var n = function(t, e) {
    this.type = null,
    this.options = null,
    this.enabled = null,
    this.timeout = null,
    this.hoverState = null,
    this.$element = null,
    this.inState = null,
    this.init("tooltip", t, e)
  };
  n.VERSION = "3.3.5",
  n.TRANSITION_DURATION = 150,
  n.DEFAULTS = {
    animation: !0,
    placement: "top",
    selector: !1,
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: "hover focus",
    title: "",
    delay: 0,
    html: !1,
    container: !1,
    viewport: {
      selector: "body",
      padding: 0
    }
  },
  n.prototype.init = function(e, n, i) {
    if (this.enabled = !0,
    this.type = e,
    this.$element = t(n),
    this.options = this.getOptions(i),
    this.$viewport = this.options.viewport && t(t.isFunction(this.options.viewport) ? this.options.viewport.call(this, this.$element) : this.options.viewport.selector || this.options.viewport),
    this.inState = {
      click: !1,
      hover: !1,
      focus: !1
    },
    this.$element[0]instanceof document.constructor && !this.options.selector)
      throw new Error("`selector` option must be specified when initializing " + this.type + " on the window.document object!");
    for (var r = this.options.trigger.split(" "), o = r.length; o--; ) {
      var s = r[o];
      if ("click" == s)
        this.$element.on("click." + this.type, this.options.selector, t.proxy(this.toggle, this));
      else if ("manual" != s) {
        var a = "hover" == s ? "mouseenter" : "focusin"
          , l = "hover" == s ? "mouseleave" : "focusout";
        this.$element.on(a + "." + this.type, this.options.selector, t.proxy(this.enter, this)),
        this.$element.on(l + "." + this.type, this.options.selector, t.proxy(this.leave, this))
      }
    }
    this.options.selector ? this._options = t.extend({}, this.options, {
      trigger: "manual",
      selector: ""
    }) : this.fixTitle()
  }
  ,
  n.prototype.getDefaults = function() {
    return n.DEFAULTS
  }
  ,
  n.prototype.getOptions = function(e) {
    return e = t.extend({}, this.getDefaults(), this.$element.data(), e),
    e.delay && "number" == typeof e.delay && (e.delay = {
      show: e.delay,
      hide: e.delay
    }),
    e
  }
  ,
  n.prototype.getDelegateOptions = function() {
    var e = {}
      , n = this.getDefaults();
    return this._options && t.each(this._options, function(t, i) {
      n[t] != i && (e[t] = i)
    }),
    e
  }
  ,
  n.prototype.enter = function(e) {
    var n = e instanceof this.constructor ? e : t(e.currentTarget).data("bs." + this.type);
    return n || (n = new this.constructor(e.currentTarget,this.getDelegateOptions()),
    t(e.currentTarget).data("bs." + this.type, n)),
    e instanceof t.Event && (n.inState["focusin" == e.type ? "focus" : "hover"] = !0),
    n.tip().hasClass("in") || "in" == n.hoverState ? void (n.hoverState = "in") : (clearTimeout(n.timeout),
    n.hoverState = "in",
    n.options.delay && n.options.delay.show ? void (n.timeout = setTimeout(function() {
      "in" == n.hoverState && n.show()
    }, n.options.delay.show)) : n.show())
  }
  ,
  n.prototype.isInStateTrue = function() {
    for (var t in this.inState)
      if (this.inState[t])
        return !0;
    return !1
  }
  ,
  n.prototype.leave = function(e) {
    var n = e instanceof this.constructor ? e : t(e.currentTarget).data("bs." + this.type);
    return n || (n = new this.constructor(e.currentTarget,this.getDelegateOptions()),
    t(e.currentTarget).data("bs." + this.type, n)),
    e instanceof t.Event && (n.inState["focusout" == e.type ? "focus" : "hover"] = !1),
    n.isInStateTrue() ? void 0 : (clearTimeout(n.timeout),
    n.hoverState = "out",
    n.options.delay && n.options.delay.hide ? void (n.timeout = setTimeout(function() {
      "out" == n.hoverState && n.hide()
    }, n.options.delay.hide)) : n.hide())
  }
  ,
  n.prototype.show = function() {
    var e = t.Event("show.bs." + this.type);
    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e);
      var i = t.contains(this.$element[0].ownerDocument.documentElement, this.$element[0]);
      if (e.isDefaultPrevented() || !i)
        return;
      var r = this
        , o = this.tip()
        , s = this.getUID(this.type);
      this.setContent(),
      o.attr("id", s),
      this.$element.attr("aria-describedby", s),
      this.options.animation && o.addClass("fade");
      var a = "function" == typeof this.options.placement ? this.options.placement.call(this, o[0], this.$element[0]) : this.options.placement
        , l = /\s?auto?\s?/i
        , u = l.test(a);
      u && (a = a.replace(l, "") || "top"),
      o.detach().css({
        top: 0,
        left: 0,
        display: "block"
      }).addClass(a).data("bs." + this.type, this),
      this.options.container ? o.appendTo(this.options.container) : o.insertAfter(this.$element),
      this.$element.trigger("inserted.bs." + this.type);
      var c = this.getPosition()
        , h = o[0].offsetWidth
        , d = o[0].offsetHeight;
      if (u) {
        var f = a
          , p = this.getPosition(this.$viewport);
        a = "bottom" == a && c.bottom + d > p.bottom ? "top" : "top" == a && c.top - d < p.top ? "bottom" : "right" == a && c.right + h > p.width ? "left" : "left" == a && c.left - h < p.left ? "right" : a,
        o.removeClass(f).addClass(a)
      }
      var m = this.getCalculatedOffset(a, c, h, d);
      this.applyPlacement(m, a);
      var g = function() {
        var t = r.hoverState;
        r.$element.trigger("shown.bs." + r.type),
        r.hoverState = null,
        "out" == t && r.leave(r)
      };
      t.support.transition && this.$tip.hasClass("fade") ? o.one("bsTransitionEnd", g).emulateTransitionEnd(n.TRANSITION_DURATION) : g()
    }
  }
  ,
  n.prototype.applyPlacement = function(e, n) {
    var i = this.tip()
      , r = i[0].offsetWidth
      , o = i[0].offsetHeight
      , s = parseInt(i.css("margin-top"), 10)
      , a = parseInt(i.css("margin-left"), 10);
    isNaN(s) && (s = 0),
    isNaN(a) && (a = 0),
    e.top += s,
    e.left += a,
    t.offset.setOffset(i[0], t.extend({
      using: function(t) {
        i.css({
          top: Math.round(t.top),
          left: Math.round(t.left)
        })
      }
    }, e), 0),
    i.addClass("in");
    var l = i[0].offsetWidth
      , u = i[0].offsetHeight;
    "top" == n && u != o && (e.top = e.top + o - u);
    var c = this.getViewportAdjustedDelta(n, e, l, u);
    c.left ? e.left += c.left : e.top += c.top;
    var h = /top|bottom/.test(n)
      , d = h ? 2 * c.left - r + l : 2 * c.top - o + u
      , f = h ? "offsetWidth" : "offsetHeight";
    i.offset(e),
    this.replaceArrow(d, i[0][f], h)
  }
  ,
  n.prototype.replaceArrow = function(t, e, n) {
    this.arrow().css(n ? "left" : "top", 50 * (1 - t / e) + "%").css(n ? "top" : "left", "")
  }
  ,
  n.prototype.setContent = function() {
    var t = this.tip()
      , e = this.getTitle();
    t.find(".tooltip-inner")[this.options.html ? "html" : "text"](e),
    t.removeClass("fade in top bottom left right")
  }
  ,
  n.prototype.hide = function(e) {
    function i() {
      "in" != r.hoverState && o.detach(),
      r.$element.removeAttr("aria-describedby").trigger("hidden.bs." + r.type),
      e && e()
    }
    var r = this
      , o = t(this.$tip)
      , s = t.Event("hide.bs." + this.type);
    return this.$element.trigger(s),
    s.isDefaultPrevented() ? void 0 : (o.removeClass("in"),
    t.support.transition && o.hasClass("fade") ? o.one("bsTransitionEnd", i).emulateTransitionEnd(n.TRANSITION_DURATION) : i(),
    this.hoverState = null,
    this)
  }
  ,
  n.prototype.fixTitle = function() {
    var t = this.$element;
    (t.attr("title") || "string" != typeof t.attr("data-original-title")) && t.attr("data-original-title", t.attr("title") || "").attr("title", "")
  }
  ,
  n.prototype.hasContent = function() {
    return this.getTitle()
  }
  ,
  n.prototype.getPosition = function(e) {
    e = e || this.$element;
    var n = e[0]
      , i = "BODY" == n.tagName
      , r = n.getBoundingClientRect();
    null == r.width && (r = t.extend({}, r, {
      width: r.right - r.left,
      height: r.bottom - r.top
    }));
    var o = i ? {
      top: 0,
      left: 0
    } : e.offset()
      , s = {
      scroll: i ? document.documentElement.scrollTop || document.body.scrollTop : e.scrollTop()
    }
      , a = i ? {
      width: t(window).width(),
      height: t(window).height()
    } : null;
    return t.extend({}, r, s, a, o)
  }
  ,
  n.prototype.getCalculatedOffset = function(t, e, n, i) {
    return "bottom" == t ? {
      top: e.top + e.height,
      left: e.left + e.width / 2 - n / 2
    } : "top" == t ? {
      top: e.top - i,
      left: e.left + e.width / 2 - n / 2
    } : "left" == t ? {
      top: e.top + e.height / 2 - i / 2,
      left: e.left - n
    } : {
      top: e.top + e.height / 2 - i / 2,
      left: e.left + e.width
    }
  }
  ,
  n.prototype.getViewportAdjustedDelta = function(t, e, n, i) {
    var r = {
      top: 0,
      left: 0
    };
    if (!this.$viewport)
      return r;
    var o = this.options.viewport && this.options.viewport.padding || 0
      , s = this.getPosition(this.$viewport);
    if (/right|left/.test(t)) {
      var a = e.top - o - s.scroll
        , l = e.top + o - s.scroll + i;
      a < s.top ? r.top = s.top - a : l > s.top + s.height && (r.top = s.top + s.height - l)
    } else {
      var u = e.left - o
        , c = e.left + o + n;
      u < s.left ? r.left = s.left - u : c > s.right && (r.left = s.left + s.width - c)
    }
    return r
  }
  ,
  n.prototype.getTitle = function() {
    var t, e = this.$element, n = this.options;
    return t = e.attr("data-original-title") || ("function" == typeof n.title ? n.title.call(e[0]) : n.title)
  }
  ,
  n.prototype.getUID = function(t) {
    do
      t += ~~(1e6 * Math.random());
    while (document.getElementById(t));return t
  }
  ,
  n.prototype.tip = function() {
    if (!this.$tip && (this.$tip = t(this.options.template),
    1 != this.$tip.length))
      throw new Error(this.type + " `template` option must consist of exactly 1 top-level element!");
    return this.$tip
  }
  ,
  n.prototype.arrow = function() {
    return this.$arrow = this.$arrow || this.tip().find(".tooltip-arrow")
  }
  ,
  n.prototype.enable = function() {
    this.enabled = !0
  }
  ,
  n.prototype.disable = function() {
    this.enabled = !1
  }
  ,
  n.prototype.toggleEnabled = function() {
    this.enabled = !this.enabled
  }
  ,
  n.prototype.toggle = function(e) {
    var n = this;
    e && (n = t(e.currentTarget).data("bs." + this.type),
    n || (n = new this.constructor(e.currentTarget,this.getDelegateOptions()),
    t(e.currentTarget).data("bs." + this.type, n))),
    e ? (n.inState.click = !n.inState.click,
    n.isInStateTrue() ? n.enter(n) : n.leave(n)) : n.tip().hasClass("in") ? n.leave(n) : n.enter(n)
  }
  ,
  n.prototype.destroy = function() {
    var t = this;
    clearTimeout(this.timeout),
    this.hide(function() {
      t.$element.off("." + t.type).removeData("bs." + t.type),
      t.$tip && t.$tip.detach(),
      t.$tip = null,
      t.$arrow = null,
      t.$viewport = null
    })
  }
  ;
  var i = t.fn.tooltip;
  t.fn.tooltip = e,
  t.fn.tooltip.Constructor = n,
  t.fn.tooltip.noConflict = function() {
    return t.fn.tooltip = i,
    this
  }
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    return this.each(function() {
      var i = t(this)
        , r = i.data("bs.popover")
        , o = "object" == typeof e && e;
      (r || !/destroy|hide/.test(e)) && (r || i.data("bs.popover", r = new n(this,o)),
      "string" == typeof e && r[e]())
    })
  }
  var n = function(t, e) {
    this.init("popover", t, e)
  };
  if (!t.fn.tooltip)
    throw new Error("Popover requires tooltip.js");
  n.VERSION = "3.3.5",
  n.DEFAULTS = t.extend({}, t.fn.tooltip.Constructor.DEFAULTS, {
    placement: "right",
    trigger: "click",
    content: "",
    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  }),
  n.prototype = t.extend({}, t.fn.tooltip.Constructor.prototype),
  n.prototype.constructor = n,
  n.prototype.getDefaults = function() {
    return n.DEFAULTS
  }
  ,
  n.prototype.setContent = function() {
    var t = this.tip()
      , e = this.getTitle()
      , n = this.getContent();
    t.find(".popover-title")[this.options.html ? "html" : "text"](e),
    t.find(".popover-content").children().detach().end()[this.options.html ? "string" == typeof n ? "html" : "append" : "text"](n),
    t.removeClass("fade top bottom left right in"),
    t.find(".popover-title").html() || t.find(".popover-title").hide()
  }
  ,
  n.prototype.hasContent = function() {
    return this.getTitle() || this.getContent()
  }
  ,
  n.prototype.getContent = function() {
    var t = this.$element
      , e = this.options;
    return t.attr("data-content") || ("function" == typeof e.content ? e.content.call(t[0]) : e.content)
  }
  ,
  n.prototype.arrow = function() {
    return this.$arrow = this.$arrow || this.tip().find(".arrow")
  }
  ;
  var i = t.fn.popover;
  t.fn.popover = e,
  t.fn.popover.Constructor = n,
  t.fn.popover.noConflict = function() {
    return t.fn.popover = i,
    this
  }
}(jQuery),
+function(t) {
  "use strict";
  function e(n, i) {
    this.$body = t(document.body),
    this.$scrollElement = t(t(n).is(document.body) ? window : n),
    this.options = t.extend({}, e.DEFAULTS, i),
    this.selector = (this.options.target || "") + " .nav li > a",
    this.offsets = [],
    this.targets = [],
    this.activeTarget = null,
    this.scrollHeight = 0,
    this.$scrollElement.on("scroll.bs.scrollspy", t.proxy(this.process, this)),
    this.refresh(),
    this.process()
  }
  function n(n) {
    return this.each(function() {
      var i = t(this)
        , r = i.data("bs.scrollspy")
        , o = "object" == typeof n && n;
      r || i.data("bs.scrollspy", r = new e(this,o)),
      "string" == typeof n && r[n]()
    })
  }
  e.VERSION = "3.3.5",
  e.DEFAULTS = {
    offset: 10
  },
  e.prototype.getScrollHeight = function() {
    return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight)
  }
  ,
  e.prototype.refresh = function() {
    var e = this
      , n = "offset"
      , i = 0;
    this.offsets = [],
    this.targets = [],
    this.scrollHeight = this.getScrollHeight(),
    t.isWindow(this.$scrollElement[0]) || (n = "position",
    i = this.$scrollElement.scrollTop()),
    this.$body.find(this.selector).map(function() {
      var e = t(this)
        , r = e.data("target") || e.attr("href")
        , o = /^#./.test(r) && t(r);
      return o && o.length && o.is(":visible") && [[o[n]().top + i, r]] || null
    }).sort(function(t, e) {
      return t[0] - e[0]
    }).each(function() {
      e.offsets.push(this[0]),
      e.targets.push(this[1])
    })
  }
  ,
  e.prototype.process = function() {
    var t, e = this.$scrollElement.scrollTop() + this.options.offset, n = this.getScrollHeight(), i = this.options.offset + n - this.$scrollElement.height(), r = this.offsets, o = this.targets, s = this.activeTarget;
    if (this.scrollHeight != n && this.refresh(),
    e >= i)
      return s != (t = o[o.length - 1]) && this.activate(t);
    if (s && e < r[0])
      return this.activeTarget = null,
      this.clear();
    for (t = r.length; t--; )
      s != o[t] && e >= r[t] && (void 0 === r[t + 1] || e < r[t + 1]) && this.activate(o[t])
  }
  ,
  e.prototype.activate = function(e) {
    this.activeTarget = e,
    this.clear();
    var n = this.selector + '[data-target="' + e + '"],' + this.selector + '[href="' + e + '"]'
      , i = t(n).parents("li").addClass("active");
    i.parent(".dropdown-menu").length && (i = i.closest("li.dropdown").addClass("active")),
    i.trigger("activate.bs.scrollspy")
  }
  ,
  e.prototype.clear = function() {
    t(this.selector).parentsUntil(this.options.target, ".active").removeClass("active")
  }
  ;
  var i = t.fn.scrollspy;
  t.fn.scrollspy = n,
  t.fn.scrollspy.Constructor = e,
  t.fn.scrollspy.noConflict = function() {
    return t.fn.scrollspy = i,
    this
  }
  ,
  t(window).on("load.bs.scrollspy.data-api", function() {
    t('[data-spy="scroll"]').each(function() {
      var e = t(this);
      n.call(e, e.data())
    })
  })
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    return this.each(function() {
      var i = t(this)
        , r = i.data("bs.tab");
      r || i.data("bs.tab", r = new n(this)),
      "string" == typeof e && r[e]()
    })
  }
  var n = function(e) {
    this.element = t(e)
  };
  n.VERSION = "3.3.5",
  n.TRANSITION_DURATION = 150,
  n.prototype.show = function() {
    var e = this.element
      , n = e.closest("ul:not(.dropdown-menu)")
      , i = e.data("target");
    if (i || (i = e.attr("href"),
    i = i && i.replace(/.*(?=#[^\s]*$)/, "")),
    !e.parent("li").hasClass("active")) {
      var r = n.find(".active:last a")
        , o = t.Event("hide.bs.tab", {
        relatedTarget: e[0]
      })
        , s = t.Event("show.bs.tab", {
        relatedTarget: r[0]
      });
      if (r.trigger(o),
      e.trigger(s),
      !s.isDefaultPrevented() && !o.isDefaultPrevented()) {
        var a = t(i);
        this.activate(e.closest("li"), n),
        this.activate(a, a.parent(), function() {
          r.trigger({
            type: "hidden.bs.tab",
            relatedTarget: e[0]
          }),
          e.trigger({
            type: "shown.bs.tab",
            relatedTarget: r[0]
          })
        })
      }
    }
  }
  ,
  n.prototype.activate = function(e, i, r) {
    function o() {
      s.removeClass("active").find("> .dropdown-menu > .active").removeClass("active").end().find('[data-toggle="tab"]').attr("aria-expanded", !1),
      e.addClass("active").find('[data-toggle="tab"]').attr("aria-expanded", !0),
      a ? (e[0].offsetWidth,
      e.addClass("in")) : e.removeClass("fade"),
      e.parent(".dropdown-menu").length && e.closest("li.dropdown").addClass("active").end().find('[data-toggle="tab"]').attr("aria-expanded", !0),
      r && r()
    }
    var s = i.find("> .active")
      , a = r && t.support.transition && (s.length && s.hasClass("fade") || !!i.find("> .fade").length);
    s.length && a ? s.one("bsTransitionEnd", o).emulateTransitionEnd(n.TRANSITION_DURATION) : o(),
    s.removeClass("in")
  }
  ;
  var i = t.fn.tab;
  t.fn.tab = e,
  t.fn.tab.Constructor = n,
  t.fn.tab.noConflict = function() {
    return t.fn.tab = i,
    this
  }
  ;
  var r = function(n) {
    n.preventDefault(),
    e.call(t(this), "show")
  };
  t(document).on("click.bs.tab.data-api", '[data-toggle="tab"]', r).on("click.bs.tab.data-api", '[data-toggle="pill"]', r)
}(jQuery),
+function(t) {
  "use strict";
  function e(e) {
    return this.each(function() {
      var i = t(this)
        , r = i.data("bs.affix")
        , o = "object" == typeof e && e;
      r || i.data("bs.affix", r = new n(this,o)),
      "string" == typeof e && r[e]()
    })
  }
  var n = function(e, i) {
    this.options = t.extend({}, n.DEFAULTS, i),
    this.$target = t(this.options.target).on("scroll.bs.affix.data-api", t.proxy(this.checkPosition, this)).on("click.bs.affix.data-api", t.proxy(this.checkPositionWithEventLoop, this)),
    this.$element = t(e),
    this.affixed = null,
    this.unpin = null,
    this.pinnedOffset = null,
    this.checkPosition()
  };
  n.VERSION = "3.3.5",
  n.RESET = "affix affix-top affix-bottom",
  n.DEFAULTS = {
    offset: 0,
    target: window
  },
  n.prototype.getState = function(t, e, n, i) {
    var r = this.$target.scrollTop()
      , o = this.$element.offset()
      , s = this.$target.height();
    if (null != n && "top" == this.affixed)
      return n > r ? "top" : !1;
    if ("bottom" == this.affixed)
      return null != n ? r + this.unpin <= o.top ? !1 : "bottom" : t - i >= r + s ? !1 : "bottom";
    var a = null == this.affixed
      , l = a ? r : o.top
      , u = a ? s : e;
    return null != n && n >= r ? "top" : null != i && l + u >= t - i ? "bottom" : !1
  }
  ,
  n.prototype.getPinnedOffset = function() {
    if (this.pinnedOffset)
      return this.pinnedOffset;
    this.$element.removeClass(n.RESET).addClass("affix");
    var t = this.$target.scrollTop()
      , e = this.$element.offset();
    return this.pinnedOffset = e.top - t
  }
  ,
  n.prototype.checkPositionWithEventLoop = function() {
    setTimeout(t.proxy(this.checkPosition, this), 1)
  }
  ,
  n.prototype.checkPosition = function() {
    if (this.$element.is(":visible")) {
      var e = this.$element.height()
        , i = this.options.offset
        , r = i.top
        , o = i.bottom
        , s = Math.max(t(document).height(), t(document.body).height());
      "object" != typeof i && (o = r = i),
      "function" == typeof r && (r = i.top(this.$element)),
      "function" == typeof o && (o = i.bottom(this.$element));
      var a = this.getState(s, e, r, o);
      if (this.affixed != a) {
        null != this.unpin && this.$element.css("top", "");
        var l = "affix" + (a ? "-" + a : "")
          , u = t.Event(l + ".bs.affix");
        if (this.$element.trigger(u),
        u.isDefaultPrevented())
          return;
        this.affixed = a,
        this.unpin = "bottom" == a ? this.getPinnedOffset() : null,
        this.$element.removeClass(n.RESET).addClass(l).trigger(l.replace("affix", "affixed") + ".bs.affix")
      }
      "bottom" == a && this.$element.offset({
        top: s - e - o
      })
    }
  }
  ;
  var i = t.fn.affix;
  t.fn.affix = e,
  t.fn.affix.Constructor = n,
  t.fn.affix.noConflict = function() {
    return t.fn.affix = i,
    this
  }
  ,
  t(window).on("load", function() {
    t('[data-spy="affix"]').each(function() {
      var n = t(this)
        , i = n.data();
      i.offset = i.offset || {},
      null != i.offsetBottom && (i.offset.bottom = i.offsetBottom),
      null != i.offsetTop && (i.offset.top = i.offsetTop),
      e.call(n, i)
    })
  })
}(jQuery),
function(t, e) {
  "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : t.Vue = e()
}(this, function() {
  "use strict";
  function t(e, i, r) {
    if (n(e, i))
      return void (e[i] = r);
    if (e._isVue)
      return void t(e._data, i, r);
    var o = e.__ob__;
    if (!o)
      return void (e[i] = r);
    if (o.convert(i, r),
    o.dep.notify(),
    o.vms)
      for (var s = o.vms.length; s--; ) {
        var a = o.vms[s];
        a._proxy(i),
        a._digest()
      }
  }
  function e(t, e) {
    if (n(t, e)) {
      delete t[e];
      var i = t.__ob__;
      if (i && (i.dep.notify(),
      i.vms))
        for (var r = i.vms.length; r--; ) {
          var o = i.vms[r];
          o._unproxy(e),
          o._digest()
        }
    }
  }
  function n(t, e) {
    return mn.call(t, e)
  }
  function i(t) {
    return gn.test(t)
  }
  function r(t) {
    var e = (t + "").charCodeAt(0);
    return 36 === e || 95 === e
  }
  function o(t) {
    return null == t ? "" : t.toString()
  }
  function s(t) {
    if ("string" != typeof t)
      return t;
    var e = Number(t);
    return isNaN(e) ? t : e
  }
  function a(t) {
    return "true" === t ? !0 : "false" === t ? !1 : t
  }
  function l(t) {
    var e = t.charCodeAt(0)
      , n = t.charCodeAt(t.length - 1);
    return e !== n || 34 !== e && 39 !== e ? t : t.slice(1, -1)
  }
  function u(t) {
    return t.replace(vn, c)
  }
  function c(t, e) {
    return e ? e.toUpperCase() : ""
  }
  function h(t) {
    return t.replace(yn, "$1-$2").toLowerCase()
  }
  function d(t) {
    return t.replace(bn, c)
  }
  function f(t, e) {
    return function(n) {
      var i = arguments.length;
      return i ? i > 1 ? t.apply(e, arguments) : t.call(e, n) : t.call(e)
    }
  }
  function p(t, e) {
    e = e || 0;
    for (var n = t.length - e, i = new Array(n); n--; )
      i[n] = t[n + e];
    return i
  }
  function m(t, e) {
    for (var n = Object.keys(e), i = n.length; i--; )
      t[n[i]] = e[n[i]];
    return t
  }
  function g(t) {
    return null !== t && "object" == typeof t
  }
  function v(t) {
    return _n.call(t) === wn
  }
  function y(t, e, n, i) {
    Object.defineProperty(t, e, {
      value: n,
      enumerable: !!i,
      writable: !0,
      configurable: !0
    })
  }
  function b(t, e) {
    var n, i, r, o, s, a = function l() {
      var a = Date.now() - o;
      e > a && a >= 0 ? n = setTimeout(l, e - a) : (n = null,
      s = t.apply(r, i),
      n || (r = i = null))
    };
    return function() {
      return r = this,
      i = arguments,
      o = Date.now(),
      n || (n = setTimeout(a, e)),
      s
    }
  }
  function _(t, e) {
    for (var n = t.length; n--; )
      if (t[n] === e)
        return n;
    return -1
  }
  function w(t) {
    var e = function n() {
      return n.cancelled ? void 0 : t.apply(this, arguments)
    };
    return e.cancel = function() {
      e.cancelled = !0
    }
    ,
    e
  }
  function x(t, e) {
    return t == e || (g(t) && g(e) ? JSON.stringify(t) === JSON.stringify(e) : !1)
  }
  function k(t) {
    this.size = 0,
    this.limit = t,
    this.head = this.tail = void 0,
    this._keymap = Object.create(null)
  }
  function C() {
    var t, e = Ln.slice(Rn, In).trim();
    if (e) {
      t = {};
      var n = e.match(zn);
      t.name = n[0],
      n.length > 1 && (t.args = n.slice(1).map(T))
    }
    t && (Pn.filters = Pn.filters || []).push(t),
    Rn = In + 1
  }
  function T(t) {
    if (Gn.test(t))
      return {
        value: s(t),
        dynamic: !1
      };
    var e = l(t)
      , n = e === t;
    return {
      value: n ? t : e,
      dynamic: n
    }
  }
  function $(t) {
    var e = Vn.get(t);
    if (e)
      return e;
    for (Ln = t,
    Wn = Yn = !1,
    qn = Un = Bn = 0,
    Rn = 0,
    Pn = {},
    In = 0,
    Hn = Ln.length; Hn > In; In++)
      if (Fn = Ln.charCodeAt(In),
      Wn)
        39 === Fn && (Wn = !Wn);
      else if (Yn)
        34 === Fn && (Yn = !Yn);
      else if (124 === Fn && 124 !== Ln.charCodeAt(In + 1) && 124 !== Ln.charCodeAt(In - 1))
        null == Pn.expression ? (Rn = In + 1,
        Pn.expression = Ln.slice(0, In).trim()) : C();
      else
        switch (Fn) {
        case 34:
          Yn = !0;
          break;
        case 39:
          Wn = !0;
          break;
        case 40:
          Bn++;
          break;
        case 41:
          Bn--;
          break;
        case 91:
          Un++;
          break;
        case 93:
          Un--;
          break;
        case 123:
          qn++;
          break;
        case 125:
          qn--
        }
    return null == Pn.expression ? Pn.expression = Ln.slice(0, In).trim() : 0 !== Rn && C(),
    Vn.put(t, Pn),
    Pn
  }
  function S(t) {
    return t.replace(Jn, "\\$&")
  }
  function D() {
    var t = S(ri.delimiters[0])
      , e = S(ri.delimiters[1])
      , n = S(ri.unsafeDelimiters[0])
      , i = S(ri.unsafeDelimiters[1]);
    Zn = new RegExp(n + "(.+?)" + i + "|" + t + "(.+?)" + e,"g"),
    Kn = new RegExp("^" + n + ".*" + i + "$"),
    Qn = new k(1e3)
  }
  function E(t) {
    Qn || D();
    var e = Qn.get(t);
    if (e)
      return e;
    if (t = t.replace(/\n/g, ""),
    !Zn.test(t))
      return null;
    for (var n, i, r, o, s, a, l = [], u = Zn.lastIndex = 0; n = Zn.exec(t); )
      i = n.index,
      i > u && l.push({
        value: t.slice(u, i)
      }),
      r = Kn.test(n[0]),
      o = r ? n[1] : n[2],
      s = o.charCodeAt(0),
      a = 42 === s,
      o = a ? o.slice(1) : o,
      l.push({
        tag: !0,
        value: o.trim(),
        html: r,
        oneTime: a
      }),
      u = i + n[0].length;
    return u < t.length && l.push({
      value: t.slice(u)
    }),
    Qn.put(t, l),
    l
  }
  function O(t) {
    return t.length > 1 ? t.map(function(t) {
      return A(t)
    }).join("+") : A(t[0], !0)
  }
  function A(t, e) {
    return t.tag ? N(t.value, e) : '"' + t.value + '"'
  }
  function N(t, e) {
    if (ti.test(t)) {
      var n = $(t);
      return n.filters ? "this._applyFilters(" + n.expression + ",null," + JSON.stringify(n.filters) + ",false)" : "(" + t + ")"
    }
    return e ? t : "(" + t + ")"
  }
  function j(t, e, n, i) {
    P(t, 1, function() {
      e.appendChild(t)
    }, n, i)
  }
  function M(t, e, n, i) {
    P(t, 1, function() {
      W(t, e)
    }, n, i)
  }
  function L(t, e, n) {
    P(t, -1, function() {
      q(t)
    }, e, n)
  }
  function P(t, e, n, i, r) {
    var o = t.__v_trans;
    if (!o || !o.hooks && !Dn || !i._isCompiled || i.$parent && !i.$parent._isCompiled)
      return n(),
      void (r && r());
    var s = e > 0 ? "enter" : "leave";
    o[s](n, r)
  }
  function F(t) {
    if ("string" == typeof t) {
      var e = t;
      t = document.querySelector(t),
      t || oi("Cannot find element: " + e)
    }
    return t
  }
  function I(t) {
    var e = document.documentElement
      , n = t && t.parentNode;
    return e === t || e === n || !(!n || 1 !== n.nodeType || !e.contains(n))
  }
  function H(t, e) {
    var n = t.getAttribute(e);
    return null !== n && t.removeAttribute(e),
    n
  }
  function R(t, e) {
    var n = H(t, ":" + e);
    return null === n && (n = H(t, "v-bind:" + e)),
    n
  }
  function W(t, e) {
    e.parentNode.insertBefore(t, e)
  }
  function Y(t, e) {
    e.nextSibling ? W(t, e.nextSibling) : e.parentNode.appendChild(t)
  }
  function q(t) {
    t.parentNode.removeChild(t)
  }
  function U(t, e) {
    e.firstChild ? W(t, e.firstChild) : e.appendChild(t)
  }
  function B(t, e) {
    var n = t.parentNode;
    n && n.replaceChild(e, t)
  }
  function V(t, e, n) {
    t.addEventListener(e, n)
  }
  function z(t, e, n) {
    t.removeEventListener(e, n)
  }
  function G(t, e) {
    if (t.classList)
      t.classList.add(e);
    else {
      var n = " " + (t.getAttribute("class") || "") + " ";
      n.indexOf(" " + e + " ") < 0 && t.setAttribute("class", (n + e).trim())
    }
  }
  function X(t, e) {
    if (t.classList)
      t.classList.remove(e);
    else {
      for (var n = " " + (t.getAttribute("class") || "") + " ", i = " " + e + " "; n.indexOf(i) >= 0; )
        n = n.replace(i, " ");
      t.setAttribute("class", n.trim())
    }
    t.className || t.removeAttribute("class")
  }
  function J(t, e) {
    var n, i;
    if (K(t) && t.content instanceof DocumentFragment && (t = t.content),
    t.hasChildNodes())
      for (Q(t),
      i = e ? document.createDocumentFragment() : document.createElement("div"); n = t.firstChild; )
        i.appendChild(n);
    return i
  }
  function Q(t) {
    Z(t, t.firstChild),
    Z(t, t.lastChild)
  }
  function Z(t, e) {
    e && 3 === e.nodeType && !e.data.trim() && t.removeChild(e)
  }
  function K(t) {
    return t.tagName && "template" === t.tagName.toLowerCase()
  }
  function tt(t, e) {
    var n = ri.debug ? document.createComment(t) : document.createTextNode(e ? " " : "");
    return n.__vue_anchor = !0,
    n
  }
  function et(t) {
    if (t.hasAttributes())
      for (var e = t.attributes, n = 0, i = e.length; i > n; n++) {
        var r = e[n].name;
        if (si.test(r))
          return u(r.replace(si, ""))
      }
  }
  function nt(t, e, n) {
    for (var i; t !== e; )
      i = t.nextSibling,
      n(t),
      t = i;
    n(e)
  }
  function it(t, e, n, i, r) {
    function o() {
      if (a++,
      s && a >= l.length) {
        for (var t = 0; t < l.length; t++)
          i.appendChild(l[t]);
        r && r()
      }
    }
    var s = !1
      , a = 0
      , l = [];
    nt(t, e, function(t) {
      t === e && (s = !0),
      l.push(t),
      L(t, n, o)
    })
  }
  function rt(t, e) {
    var n = t.tagName.toLowerCase()
      , i = t.hasAttributes();
    if (ai.test(n) || "component" === n) {
      if (i)
        return ot(t)
    } else {
      if (gt(e, "components", n))
        return {
          id: n
        };
      var r = i && ot(t);
      if (r)
        return r;
      (n.indexOf("-") > -1 || /HTMLUnknownElement/.test(t.toString()) && !/^(data|time|rtc|rb)$/.test(n)) && oi("Unknown custom element: <" + n + "> - did you register the component correctly?")
    }
  }
  function ot(t) {
    var e = H(t, "is");
    return null != e ? {
      id: e
    } : (e = R(t, "is"),
    null != e ? {
      id: e,
      dynamic: !0
    } : void 0)
  }
  function st(t, e, n) {
    var i = e.path;
    t[i] = t._data[i] = at(e, n) ? n : void 0
  }
  function at(t, e) {
    if (null === t.raw && !t.required)
      return !0;
    var n, i = t.options, r = i.type, o = !0;
    if (r && (r === String ? (n = "string",
    o = typeof e === n) : r === Number ? (n = "number",
    o = "number" == typeof e) : r === Boolean ? (n = "boolean",
    o = "boolean" == typeof e) : r === Function ? (n = "function",
    o = "function" == typeof e) : r === Object ? (n = "object",
    o = v(e)) : r === Array ? (n = "array",
    o = xn(e)) : o = e instanceof r),
    !o)
      return oi("Invalid prop: type check failed for " + t.path + '="' + t.raw + '". Expected ' + lt(n) + ", got " + ut(e) + "."),
      !1;
    var s = i.validator;
    return s && !s.call(null, e) ? (oi("Invalid prop: custom validator check failed for " + t.path + '="' + t.raw + '"'),
    !1) : !0
  }
  function lt(t) {
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "custom type"
  }
  function ut(t) {
    return Object.prototype.toString.call(t).slice(8, -1)
  }
  function ct(e, i) {
    var r, o, s;
    for (r in i)
      o = e[r],
      s = i[r],
      n(e, r) ? g(o) && g(s) && ct(o, s) : t(e, r, s);
    return e
  }
  function ht(t, e) {
    var n = Object.create(t);
    return e ? m(n, pt(e)) : n
  }
  function dt(t) {
    if (t.components)
      for (var e, n = t.components = pt(t.components), i = Object.keys(n), r = 0, o = i.length; o > r; r++) {
        var s = i[r];
        ai.test(s) ? oi("Do not use built-in HTML elements as component id: " + s) : (e = n[s],
        v(e) && (n[s] = un.extend(e)))
      }
  }
  function ft(t) {
    var e, n, i = t.props;
    if (xn(i))
      for (t.props = {},
      e = i.length; e--; )
        n = i[e],
        "string" == typeof n ? t.props[n] = null : n.name && (t.props[n.name] = n);
    else if (v(i)) {
      var r = Object.keys(i);
      for (e = r.length; e--; )
        n = i[r[e]],
        "function" == typeof n && (i[r[e]] = {
          type: n
        })
    }
  }
  function pt(t) {
    if (xn(t)) {
      for (var e, n = {}, i = t.length; i--; ) {
        e = t[i];
        var r = "function" == typeof e ? e.options && e.options.name || e.id : e.name || e.id;
        r ? n[r] = e : oi('Array-syntax assets must provide a "name" or "id" field.')
      }
      return n
    }
    return t
  }
  function mt(t, e, i) {
    function r(n) {
      var r = li[n] || ui;
      s[n] = r(t[n], e[n], i, n)
    }
    dt(e),
    ft(e);
    var o, s = {};
    if (e.mixins)
      for (var a = 0, l = e.mixins.length; l > a; a++)
        t = mt(t, e.mixins[a], i);
    for (o in t)
      r(o);
    for (o in e)
      n(t, o) || r(o);
    return s
  }
  function gt(t, e, n) {
    var i, r = t[e];
    return r[n] || r[i = u(n)] || r[i.charAt(0).toUpperCase() + i.slice(1)]
  }
  function vt(t, e, n) {
    t || oi("Failed to resolve " + e + ": " + n)
  }
  function yt() {
    this.id = di++,
    this.subs = []
  }
  function bt(t) {
    if (this.value = t,
    this.dep = new yt,
    y(t, "__ob__", this),
    xn(t)) {
      var e = kn ? _t : wt;
      e(t, hi, fi),
      this.observeArray(t)
    } else
      this.walk(t)
  }
  function _t(t, e) {
    t.__proto__ = e
  }
  function wt(t, e, n) {
    for (var i, r = n.length; r--; )
      i = n[r],
      y(t, i, e[i])
  }
  function xt(t, e) {
    if (t && "object" == typeof t) {
      var i;
      return n(t, "__ob__") && t.__ob__ instanceof bt ? i = t.__ob__ : !xn(t) && !v(t) || Object.isFrozen(t) || t._isVue || (i = new bt(t)),
      i && e && i.addVm(e),
      i
    }
  }
  function kt(t, e, n) {
    var i, r, o = new yt;
    if (ri.convertAllProperties) {
      var s = Object.getOwnPropertyDescriptor(t, e);
      if (s && s.configurable === !1)
        return;
      i = s && s.get,
      r = s && s.set
    }
    var a = xt(n);
    Object.defineProperty(t, e, {
      enumerable: !0,
      configurable: !0,
      get: function() {
        var e = i ? i.call(t) : n;
        if (yt.target && (o.depend(),
        a && a.dep.depend(),
        xn(e)))
          for (var r, s = 0, l = e.length; l > s; s++)
            r = e[s],
            r && r.__ob__ && r.__ob__.dep.depend();
        return e
      },
      set: function(e) {
        var s = i ? i.call(t) : n;
        e !== s && (r ? r.call(t, e) : n = e,
        a = xt(e),
        o.notify())
      }
    })
  }
  function Ct(t) {
    t.prototype._init = function(t) {
      t = t || {},
      this.$el = null,
      this.$parent = t.parent,
      this.$root = this.$parent ? this.$parent.$root : this,
      this.$children = [],
      this.$refs = {},
      this.$els = {},
      this._watchers = [],
      this._directives = [],
      this._uid = mi++,
      this._isVue = !0,
      this._events = {},
      this._eventsCount = {},
      this._isFragment = !1,
      this._fragment = this._fragmentStart = this._fragmentEnd = null,
      this._isCompiled = this._isDestroyed = this._isReady = this._isAttached = this._isBeingDestroyed = !1,
      this._unlinkFn = null,
      this._context = t._context || this.$parent,
      this._scope = t._scope,
      this._frag = t._frag,
      this._frag && this._frag.children.push(this),
      this.$parent && this.$parent.$children.push(this),
      t = this.$options = mt(this.constructor.options, t, this),
      this._updateRef(),
      this._data = {},
      this._callHook("init"),
      this._initState(),
      this._initEvents(),
      this._callHook("created"),
      t.el && this.$mount(t.el)
    }
  }
  function Tt(t) {
    if (void 0 === t)
      return "eof";
    var e = t.charCodeAt(0);
    switch (e) {
    case 91:
    case 93:
    case 46:
    case 34:
    case 39:
    case 48:
      return t;
    case 95:
    case 36:
      return "ident";
    case 32:
    case 9:
    case 10:
    case 13:
    case 160:
    case 65279:
    case 8232:
    case 8233:
      return "ws"
    }
    return e >= 97 && 122 >= e || e >= 65 && 90 >= e ? "ident" : e >= 49 && 57 >= e ? "number" : "else"
  }
  function $t(t) {
    var e = t.trim();
    return "0" === t.charAt(0) && isNaN(t) ? !1 : i(e) ? l(e) : "*" + e
  }
  function St(t) {
    function e() {
      var e = t[c + 1];
      return h === $i && "'" === e || h === Si && '"' === e ? (c++,
      i = "\\" + e,
      f[vi](),
      !0) : void 0
    }
    var n, i, r, o, s, a, l, u = [], c = -1, h = wi, d = 0, f = [];
    for (f[yi] = function() {
      void 0 !== r && (u.push(r),
      r = void 0)
    }
    ,
    f[vi] = function() {
      void 0 === r ? r = i : r += i
    }
    ,
    f[bi] = function() {
      f[vi](),
      d++
    }
    ,
    f[_i] = function() {
      if (d > 0)
        d--,
        h = Ti,
        f[vi]();
      else {
        if (d = 0,
        r = $t(r),
        r === !1)
          return !1;
        f[yi]()
      }
    }
    ; null != h; )
      if (c++,
      n = t[c],
      "\\" !== n || !e()) {
        if (o = Tt(n),
        l = Oi[h],
        s = l[o] || l["else"] || Ei,
        s === Ei)
          return;
        if (h = s[0],
        a = f[s[1]],
        a && (i = s[2],
        i = void 0 === i ? n : i,
        a() === !1))
          return;
        if (h === Di)
          return u.raw = t,
          u
      }
  }
  function Dt(t) {
    var e = gi.get(t);
    return e || (e = St(t),
    e && gi.put(t, e)),
    e
  }
  function Et(t, e) {
    return Ft(e).get(t)
  }
  function Ot(e, n, i) {
    var r = e;
    if ("string" == typeof n && (n = St(n)),
    !n || !g(e))
      return !1;
    for (var o, s, a = 0, l = n.length; l > a; a++)
      o = e,
      s = n[a],
      "*" === s.charAt(0) && (s = Ft(s.slice(1)).get.call(r, r)),
      l - 1 > a ? (e = e[s],
      g(e) || (e = {},
      o._isVue && Ai(n),
      t(o, s, e))) : xn(e) ? e.$set(s, i) : s in e ? e[s] = i : (e._isVue && Ai(n),
      t(e, s, i));
    return !0
  }
  function At(t, e) {
    var n = Bi.length;
    return Bi[n] = e ? t.replace(Hi, "\\n") : t,
    '"' + n + '"'
  }
  function Nt(t) {
    var e = t.charAt(0)
      , n = t.slice(1);
    return Li.test(n) ? t : (n = n.indexOf('"') > -1 ? n.replace(Wi, jt) : n,
    e + "scope." + n)
  }
  function jt(t, e) {
    return Bi[e]
  }
  function Mt(t) {
    Fi.test(t) && oi("Avoid using reserved keywords in expression: " + t),
    Bi.length = 0;
    var e = t.replace(Ri, At).replace(Ii, "");
    return e = (" " + e).replace(qi, Nt).replace(Wi, jt),
    Lt(e)
  }
  function Lt(t) {
    try {
      return new Function("scope","return " + t + ";")
    } catch (e) {
      oi("Invalid expression. Generated function body: " + t)
    }
  }
  function Pt(t) {
    var e = Dt(t);
    return e ? function(t, n) {
      Ot(t, e, n)
    }
    : void oi("Invalid setter expression: " + t)
  }
  function Ft(t, e) {
    t = t.trim();
    var n = ji.get(t);
    if (n)
      return e && !n.set && (n.set = Pt(n.exp)),
      n;
    var i = {
      exp: t
    };
    return i.get = It(t) && t.indexOf("[") < 0 ? Lt("scope." + t) : Mt(t),
    e && (i.set = Pt(t)),
    ji.put(t, i),
    i
  }
  function It(t) {
    return Yi.test(t) && !Ui.test(t) && "Math." !== t.slice(0, 5)
  }
  function Ht() {
    zi = [],
    Gi = [],
    Xi = {},
    Ji = {},
    Qi = Zi = !1
  }
  function Rt() {
    Wt(zi),
    Zi = !0,
    Wt(Gi),
    Cn && window.__VUE_DEVTOOLS_GLOBAL_HOOK__ && window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit("flush"),
    Ht()
  }
  function Wt(t) {
    for (var e = 0; e < t.length; e++) {
      var n = t[e]
        , i = n.id;
      Xi[i] = null,
      n.run(),
      null != Xi[i] && (Ji[i] = (Ji[i] || 0) + 1,
      Ji[i] > ri._maxUpdateCount && (t.splice(Xi[i], 1),
      oi("You may have an infinite update loop for watcher with expression: " + n.expression)))
    }
  }
  function Yt(t) {
    var e = t.id;
    if (null == Xi[e]) {
      if (Zi && !t.user)
        return void t.run();
      var n = t.user ? Gi : zi;
      Xi[e] = n.length,
      n.push(t),
      Qi || (Qi = !0,
      jn(Rt))
    }
  }
  function qt(t, e, n, i) {
    i && m(this, i);
    var r = "function" == typeof e;
    if (this.vm = t,
    t._watchers.push(this),
    this.expression = r ? e.toString() : e,
    this.cb = n,
    this.id = ++Ki,
    this.active = !0,
    this.dirty = this.lazy,
    this.deps = Object.create(null),
    this.newDeps = null,
    this.prevError = null,
    r)
      this.getter = e,
      this.setter = void 0;
    else {
      var o = Ft(e, this.twoWay);
      this.getter = o.get,
      this.setter = o.set
    }
    this.value = this.lazy ? void 0 : this.get(),
    this.queued = this.shallow = !1
  }
  function Ut(t) {
    var e, n;
    if (xn(t))
      for (e = t.length; e--; )
        Ut(t[e]);
    else if (g(t))
      for (n = Object.keys(t),
      e = n.length; e--; )
        Ut(t[n[e]])
  }
  function Bt(t) {
    if (sr[t])
      return sr[t];
    var e = Vt(t);
    return sr[t] = sr[e] = e,
    e
  }
  function Vt(t) {
    t = h(t);
    var e = u(t)
      , n = e.charAt(0).toUpperCase() + e.slice(1);
    if (ar || (ar = document.createElement("div")),
    e in ar.style)
      return t;
    for (var i, r = ir.length; r--; )
      if (i = rr[r] + n,
      i in ar.style)
        return ir[r] + t
  }
  function zt(t, e) {
    var n = e.map(function(t) {
      var e = t.charCodeAt(0);
      return e > 47 && 58 > e ? parseInt(t, 10) : 1 === t.length && (e = t.toUpperCase().charCodeAt(0),
      e > 64 && 91 > e) ? e : mr[t]
    });
    return function(e) {
      return n.indexOf(e.keyCode) > -1 ? t.call(this, e) : void 0
    }
  }
  function Gt(t) {
    return function(e) {
      return e.stopPropagation(),
      t.call(this, e)
    }
  }
  function Xt(t) {
    return function(e) {
      return e.preventDefault(),
      t.call(this, e)
    }
  }
  function Jt(t, e, n) {
    for (var i, r, o, s = e ? [] : null, a = 0, l = t.options.length; l > a; a++)
      if (i = t.options[a],
      o = n ? i.hasAttribute("selected") : i.selected) {
        if (r = i.hasOwnProperty("_value") ? i._value : i.value,
        !e)
          return r;
        s.push(r)
      }
    return s
  }
  function Qt(t, e) {
    for (var n = t.length; n--; )
      if (x(t[n], e))
        return n;
    return -1
  }
  function Zt(t) {
    return K(t) && t.content instanceof DocumentFragment
  }
  function Kt(t, e) {
    var n = Cr.get(t);
    if (n)
      return n;
    var i = document.createDocumentFragment()
      , r = t.match(Sr)
      , o = Dr.test(t);
    if (r || o) {
      var s = r && r[1]
        , a = $r[s] || $r.efault
        , l = a[0]
        , u = a[1]
        , c = a[2]
        , h = document.createElement("div");
      for (e || (t = t.trim()),
      h.innerHTML = u + t + c; l--; )
        h = h.lastChild;
      for (var d; d = h.firstChild; )
        i.appendChild(d)
    } else
      i.appendChild(document.createTextNode(t));
    return Cr.put(t, i),
    i
  }
  function te(t) {
    if (Zt(t))
      return Q(t.content),
      t.content;
    if ("SCRIPT" === t.tagName)
      return Kt(t.textContent);
    for (var e, n = ee(t), i = document.createDocumentFragment(); e = n.firstChild; )
      i.appendChild(e);
    return Q(i),
    i
  }
  function ee(t) {
    if (!t.querySelectorAll)
      return t.cloneNode();
    var e, n, i, r = t.cloneNode(!0);
    if (Er) {
      var o = r;
      if (Zt(t) && (t = t.content,
      o = r.content),
      n = t.querySelectorAll("template"),
      n.length)
        for (i = o.querySelectorAll("template"),
        e = i.length; e--; )
          i[e].parentNode.replaceChild(ee(n[e]), i[e])
    }
    if (Or)
      if ("TEXTAREA" === t.tagName)
        r.value = t.value;
      else if (n = t.querySelectorAll("textarea"),
      n.length)
        for (i = r.querySelectorAll("textarea"),
        e = i.length; e--; )
          i[e].value = n[e].value;
    return r
  }
  function ne(t, e, n) {
    var i, r;
    return t instanceof DocumentFragment ? (Q(t),
    e ? ee(t) : t) : ("string" == typeof t ? n || "#" !== t.charAt(0) ? r = Kt(t, n) : (r = Tr.get(t),
    r || (i = document.getElementById(t.slice(1)),
    i && (r = te(i),
    Tr.put(t, r)))) : t.nodeType && (r = te(t)),
    r && e ? ee(r) : r)
  }
  function ie(t, e, n, i, r, o) {
    this.children = [],
    this.childFrags = [],
    this.vm = e,
    this.scope = r,
    this.inserted = !1,
    this.parentFrag = o,
    o && o.childFrags.push(this),
    this.unlink = t(e, n, i, r, this);
    var s = this.single = 1 === n.childNodes.length && !n.childNodes[0].__vue_anchor;
    s ? (this.node = n.childNodes[0],
    this.before = re,
    this.remove = oe) : (this.node = tt("fragment-start"),
    this.end = tt("fragment-end"),
    this.frag = n,
    U(this.node, n),
    n.appendChild(this.end),
    this.before = se,
    this.remove = ae),
    this.node.__vfrag__ = this
  }
  function re(t, e) {
    this.inserted = !0;
    var n = e !== !1 ? M : W;
    n(this.node, t, this.vm),
    I(this.node) && this.callHook(le)
  }
  function oe() {
    this.inserted = !1;
    var t = I(this.node)
      , e = this;
    e.callHook(ue),
    L(this.node, this.vm, function() {
      t && e.callHook(ce),
      e.destroy()
    })
  }
  function se(t, e) {
    this.inserted = !0;
    var n = this.vm
      , i = e !== !1 ? M : W;
    nt(this.node, this.end, function(e) {
      i(e, t, n)
    }),
    I(this.node) && this.callHook(le)
  }
  function ae() {
    this.inserted = !1;
    var t = this
      , e = I(this.node);
    t.callHook(ue),
    it(this.node, this.end, this.vm, this.frag, function() {
      e && t.callHook(ce),
      t.destroy()
    })
  }
  function le(t) {
    t._isAttached || t._callHook("attached")
  }
  function ue(t) {
    t.$destroy(!1, !0)
  }
  function ce(t) {
    t._isAttached && t._callHook("detached")
  }
  function he(t, e) {
    this.vm = t;
    var n, i = "string" == typeof e;
    i || K(e) ? n = ne(e, !0) : (n = document.createDocumentFragment(),
    n.appendChild(e)),
    this.template = n;
    var r, o = t.constructor.cid;
    if (o > 0) {
      var s = o + (i ? e : e.outerHTML);
      r = Nr.get(s),
      r || (r = Ce(n, t.$options, !0),
      Nr.put(s, r))
    } else
      r = Ce(n, t.$options, !0);
    this.linker = r
  }
  function de(t, e, n) {
    var i = t.node.previousSibling;
    if (i) {
      for (t = i.__vfrag__; !(t && t.forId === n && t.inserted || i === e); ) {
        if (i = i.previousSibling,
        !i)
          return;
        t = i.__vfrag__
      }
      return t
    }
  }
  function fe(t) {
    var e = t.node;
    if (t.end)
      for (; !e.__vue__ && e !== t.end && e.nextSibling; )
        e = e.nextSibling;
    return e.__vue__
  }
  function pe(t) {
    for (var e = -1, n = new Array(t); ++e < t; )
      n[e] = e;
    return n
  }
  function me(t) {
    Hr.push(t),
    Rr || (Rr = !0,
    jn(ge))
  }
  function ge() {
    for (var t = document.documentElement.offsetHeight, e = 0; e < Hr.length; e++)
      Hr[e]();
    return Hr = [],
    Rr = !1,
    t
  }
  function ve(t, e, n, i) {
    this.id = e,
    this.el = t,
    this.enterClass = e + "-enter",
    this.leaveClass = e + "-leave",
    this.hooks = n,
    this.vm = i,
    this.pendingCssEvent = this.pendingCssCb = this.cancel = this.pendingJsCb = this.op = this.cb = null,
    this.justEntered = !1,
    this.entered = this.left = !1,
    this.typeCache = {};
    var r = this;
    ["enterNextTick", "enterDone", "leaveNextTick", "leaveDone"].forEach(function(t) {
      r[t] = f(r[t], r)
    })
  }
  function ye(t) {
    return !(t.offsetWidth || t.offsetHeight || t.getClientRects().length)
  }
  function be(t) {
    for (var e = {}, n = t.trim().split(/\s+/), i = n.length; i--; )
      e[n[i]] = !0;
    return e
  }
  function _e(t, e) {
    return xn(t) ? t.indexOf(e) > -1 : n(t, e)
  }
  function we(t, e) {
    for (var n, r, o, s, a, l, c, d = [], f = Object.keys(e), p = f.length; p--; )
      r = f[p],
      n = e[r] || Kr,
      "$data" !== r ? (a = u(r),
      to.test(a) ? (c = {
        name: r,
        path: a,
        options: n,
        mode: Zr.ONE_WAY,
        raw: null
      },
      o = h(r),
      null === (s = R(t, o)) && (null !== (s = R(t, o + ".sync")) ? c.mode = Zr.TWO_WAY : null !== (s = R(t, o + ".once")) && (c.mode = Zr.ONE_TIME)),
      null !== s ? (c.raw = s,
      l = $(s),
      s = l.expression,
      c.filters = l.filters,
      i(s) ? c.optimizedLiteral = !0 : (c.dynamic = !0,
      c.mode !== Zr.TWO_WAY || eo.test(s) || (c.mode = Zr.ONE_WAY,
      oi("Cannot bind two-way prop with non-settable parent path: " + s))),
      c.parentPath = s,
      n.twoWay && c.mode !== Zr.TWO_WAY && oi('Prop "' + r + '" expects a two-way binding type.')) : null !== (s = H(t, o)) ? c.raw = s : n.required && oi("Missing required prop: " + r),
      d.push(c)) : oi('Invalid prop key: "' + r + '". Prop keys must be valid identifiers.')) : oi("Do not use $data as prop.");
    return xe(d)
  }
  function xe(t) {
    return function(e, n) {
      e._props = {};
      for (var i, r, o, u, c, h = t.length; h--; )
        if (i = t[h],
        c = i.raw,
        r = i.path,
        o = i.options,
        e._props[r] = i,
        null === c)
          st(e, i, ke(e, o));
        else if (i.dynamic)
          e._context ? i.mode === Zr.ONE_TIME ? (u = (n || e._context).$get(i.parentPath),
          st(e, i, u)) : e._bindDir({
            name: "prop",
            def: Gr,
            prop: i
          }, null, null, n) : oi("Cannot bind dynamic prop on a root instance with no parent: " + i.name + '="' + c + '"');
        else if (i.optimizedLiteral) {
          var d = l(c);
          u = d === c ? a(s(c)) : d,
          st(e, i, u)
        } else
          u = o.type === Boolean && "" === c ? !0 : c,
          st(e, i, u)
    }
  }
  function ke(t, e) {
    if (!n(e, "default"))
      return e.type === Boolean ? !1 : void 0;
    var i = e["default"];
    return g(i) && oi("Object/Array as default prop values will be shared across multiple instances. Use a factory function to return the default value instead."),
    "function" == typeof i && e.type !== Function ? i.call(t) : i
  }
  function Ce(t, e, n) {
    var i = n || !e._asComponent ? Ae(t, e) : null
      , r = i && i.terminal || "SCRIPT" === t.tagName || !t.hasChildNodes() ? null : Fe(t.childNodes, e);
    return function(t, e, n, o, s) {
      var a = p(e.childNodes)
        , l = Te(function() {
        i && i(t, e, n, o, s),
        r && r(t, a, n, o, s)
      }, t);
      return Se(t, l)
    }
  }
  function Te(t, e) {
    var n = e._directives.length;
    t();
    var i = e._directives.slice(n);
    i.sort($e);
    for (var r = 0, o = i.length; o > r; r++)
      i[r]._bind();
    return i
  }
  function $e(t, e) {
    return t = t.descriptor.def.priority || lo,
    e = e.descriptor.def.priority || lo,
    t > e ? -1 : t === e ? 0 : 1
  }
  function Se(t, e, n, i) {
    return function(r) {
      De(t, e, r),
      n && i && De(n, i)
    }
  }
  function De(t, e, n) {
    for (var i = e.length; i--; )
      e[i]._teardown(),
      n || t._directives.$remove(e[i])
  }
  function Ee(t, e, n, i) {
    var r = we(e, n)
      , o = Te(function() {
      r(t, i)
    }, t);
    return Se(t, o)
  }
  function Oe(t, e, n) {
    var i, r, o = e._containerAttrs, s = e._replacerAttrs;
    if (11 !== t.nodeType)
      e._asComponent ? (o && n && (i = Ue(o, n)),
      s && (r = Ue(s, e))) : r = Ue(t.attributes, e);
    else if (o) {
      var a = o.filter(function(t) {
        return t.name.indexOf("_v-") < 0 && !io.test(t.name) && "slot" !== t.name
      }).map(function(t) {
        return '"' + t.name + '"'
      });
      if (a.length) {
        var l = a.length > 1;
        oi("Attribute" + (l ? "s " : " ") + a.join(", ") + (l ? " are" : " is") + " ignored on component <" + e.el.tagName.toLowerCase() + "> because the component is a fragment instance: http://vuejs.org/guide/components.html#Fragment_Instance")
      }
    }
    return function(t, e, n) {
      var o, s = t._context;
      s && i && (o = Te(function() {
        i(s, e, null, n)
      }, s));
      var a = Te(function() {
        r && r(t, e)
      }, t);
      return Se(t, a, s, o)
    }
  }
  function Ae(t, e) {
    var n = t.nodeType;
    return 1 === n && "SCRIPT" !== t.tagName ? Ne(t, e) : 3 === n && t.data.trim() ? je(t, e) : null
  }
  function Ne(t, e) {
    if ("TEXTAREA" === t.tagName) {
      var n = E(t.value);
      n && (t.setAttribute(":value", O(n)),
      t.value = "")
    }
    var i, r = t.hasAttributes();
    return r && (i = We(t, e)),
    i || (i = He(t, e)),
    i || (i = Re(t, e)),
    !i && r && (i = Ue(t.attributes, e)),
    i
  }
  function je(t, e) {
    if (t._skip)
      return Me;
    var n = E(t.wholeText);
    if (!n)
      return null;
    for (var i = t.nextSibling; i && 3 === i.nodeType; )
      i._skip = !0,
      i = i.nextSibling;
    for (var r, o, s = document.createDocumentFragment(), a = 0, l = n.length; l > a; a++)
      o = n[a],
      r = o.tag ? Le(o, e) : document.createTextNode(o.value),
      s.appendChild(r);
    return Pe(n, s, e)
  }
  function Me(t, e) {
    q(e)
  }
  function Le(t, e) {
    function n(e) {
      if (!t.descriptor) {
        var n = $(t.value);
        t.descriptor = {
          name: e,
          def: Ir[e],
          expression: n.expression,
          filters: n.filters
        }
      }
    }
    var i;
    return t.oneTime ? i = document.createTextNode(t.value) : t.html ? (i = document.createComment("v-html"),
    n("html")) : (i = document.createTextNode(" "),
    n("text")),
    i
  }
  function Pe(t, e) {
    return function(n, i, r, o) {
      for (var s, a, l, u = e.cloneNode(!0), c = p(u.childNodes), h = 0, d = t.length; d > h; h++)
        s = t[h],
        a = s.value,
        s.tag && (l = c[h],
        s.oneTime ? (a = (o || n).$eval(a),
        s.html ? B(l, ne(a, !0)) : l.data = a) : n._bindDir(s.descriptor, l, r, o));
      B(i, u)
    }
  }
  function Fe(t, e) {
    for (var n, i, r, o = [], s = 0, a = t.length; a > s; s++)
      r = t[s],
      n = Ae(r, e),
      i = n && n.terminal || "SCRIPT" === r.tagName || !r.hasChildNodes() ? null : Fe(r.childNodes, e),
      o.push(n, i);
    return o.length ? Ie(o) : null
  }
  function Ie(t) {
    return function(e, n, i, r, o) {
      for (var s, a, l, u = 0, c = 0, h = t.length; h > u; c++) {
        s = n[c],
        a = t[u++],
        l = t[u++];
        var d = p(s.childNodes);
        a && a(e, s, i, r, o),
        l && l(e, d, i, r, o)
      }
    }
  }
  function He(t, e) {
    var n = t.tagName.toLowerCase();
    if (!ai.test(n)) {
      var i = gt(e, "elementDirectives", n);
      return i ? qe(t, n, "", e, i) : void 0
    }
  }
  function Re(t, e) {
    var n = rt(t, e);
    if (n) {
      var i = et(t)
        , r = {
        name: "component",
        ref: i,
        expression: n.id,
        def: Qr.component,
        modifiers: {
          literal: !n.dynamic
        }
      }
        , o = function(t, e, n, o, s) {
        i && kt((o || t).$refs, i, null),
        t._bindDir(r, e, n, o, s)
      };
      return o.terminal = !0,
      o
    }
  }
  function We(t, e) {
    if (null !== H(t, "v-pre"))
      return Ye;
    if (t.hasAttribute("v-else")) {
      var n = t.previousElementSibling;
      if (n && n.hasAttribute("v-if"))
        return Ye
    }
    for (var i, r, o = 0, s = ao.length; s > o; o++)
      if (r = ao[o],
      i = t.getAttribute("v-" + r))
        return qe(t, r, i, e)
  }
  function Ye() {}
  function qe(t, e, n, i, r) {
    var o = $(n)
      , s = {
      name: e,
      expression: o.expression,
      filters: o.filters,
      raw: n,
      def: r || Ir[e]
    };
    ("for" === e || "router-view" === e) && (s.ref = et(t));
    var a = function(t, e, n, i, r) {
      s.ref && kt((i || t).$refs, s.ref, null),
      t._bindDir(s, e, n, i, r)
    };
    return a.terminal = !0,
    a
  }
  function Ue(t, e) {
    function n(t, e, n) {
      var i = $(o);
      p.push({
        name: t,
        attr: s,
        raw: a,
        def: e,
        arg: u,
        modifiers: c,
        expression: i.expression,
        filters: i.filters,
        interp: n
      })
    }
    for (var i, r, o, s, a, l, u, c, h, d, f = t.length, p = []; f--; )
      if (i = t[f],
      r = s = i.name,
      o = a = i.value,
      d = E(o),
      u = null,
      c = Be(r),
      r = r.replace(oo, ""),
      d)
        o = O(d),
        u = r,
        n("bind", Ir.bind, !0),
        "class" === r && Array.prototype.some.call(t, function(t) {
          return ":class" === t.name || "v-bind:class" === t.name
        }) && oi('class="' + a + '": Do not mix mustache interpolation and v-bind for "class" on the same element. Use one or the other.');
      else if (so.test(r))
        c.literal = !no.test(r),
        n("transition", Qr.transition);
      else if (io.test(r))
        u = r.replace(io, ""),
        n("on", Ir.on);
      else if (no.test(r))
        l = r.replace(no, ""),
        "style" === l || "class" === l ? n(l, Qr[l]) : (u = l,
        n("bind", Ir.bind));
      else if (0 === r.indexOf("v-")) {
        if (u = (u = r.match(ro)) && u[1],
        u && (r = r.replace(ro, "")),
        l = r.slice(2),
        "else" === l)
          continue;
        h = gt(e, "directives", l),
        vt(h, "directive", l),
        h && n(l, h)
      }
    return p.length ? Ve(p) : void 0
  }
  function Be(t) {
    var e = Object.create(null)
      , n = t.match(oo);
    if (n)
      for (var i = n.length; i--; )
        e[n[i].slice(1)] = !0;
    return e
  }
  function Ve(t) {
    return function(e, n, i, r, o) {
      for (var s = t.length; s--; )
        e._bindDir(t[s], n, i, r, o)
    }
  }
  function ze(t, e) {
    return e && (e._containerAttrs = Xe(t)),
    K(t) && (t = ne(t)),
    e && (e._asComponent && !e.template && (e.template = "<slot></slot>"),
    e.template && (e._content = J(t),
    t = Ge(t, e))),
    t instanceof DocumentFragment && (U(tt("v-start", !0), t),
    t.appendChild(tt("v-end", !0))),
    t
  }
  function Ge(t, e) {
    var n = e.template
      , i = ne(n, !0);
    if (i) {
      var r = i.firstChild
        , o = r.tagName && r.tagName.toLowerCase();
      return e.replace ? (t === document.body && oi("You are mounting an instance with a template to <body>. This will replace <body> entirely. You should probably use `replace: false` here."),
      i.childNodes.length > 1 || 1 !== r.nodeType || "component" === o || gt(e, "components", o) || r.hasAttribute("is") || r.hasAttribute(":is") || r.hasAttribute("v-bind:is") || gt(e, "elementDirectives", o) || r.hasAttribute("v-for") || r.hasAttribute("v-if") ? i : (e._replacerAttrs = Xe(r),
      Je(t, r),
      r)) : (t.appendChild(i),
      t)
    }
    oi("Invalid template option: " + n)
  }
  function Xe(t) {
    return 1 === t.nodeType && t.hasAttributes() ? p(t.attributes) : void 0
  }
  function Je(t, e) {
    for (var n, i, r = t.attributes, o = r.length; o--; )
      n = r[o].name,
      i = r[o].value,
      e.hasAttribute(n) || uo.test(n) ? "class" === n && i.split(/\s+/).forEach(function(t) {
        G(e, t)
      }) : e.setAttribute(n, i)
  }
  function Qe(e) {
    function i() {}
    function o(t, e) {
      var n = new qt(e,t,null,{
        lazy: !0
      });
      return function() {
        return n.dirty && n.evaluate(),
        yt.target && n.depend(),
        n.value
      }
    }
    Object.defineProperty(e.prototype, "$data", {
      get: function() {
        return this._data
      },
      set: function(t) {
        t !== this._data && this._setData(t)
      }
    }),
    e.prototype._initState = function() {
      this._initProps(),
      this._initMeta(),
      this._initMethods(),
      this._initData(),
      this._initComputed()
    }
    ,
    e.prototype._initProps = function() {
      var t = this.$options
        , e = t.el
        , n = t.props;
      n && !e && oi("Props will not be compiled if no `el` option is provided at instantiation."),
      e = t.el = F(e),
      this._propsUnlinkFn = e && 1 === e.nodeType && n ? Ee(this, e, n, this._scope) : null
    }
    ,
    e.prototype._initData = function() {
      var e = this._data
        , i = this.$options.data
        , r = i && i();
      if (r) {
        this._data = r;
        for (var o in e)
          n(r, o) && oi('Data field "' + o + '" is already defined as a prop. Use prop default value instead.'),
          null === this._props[o].raw && n(r, o) || t(r, o, e[o])
      }
      var s, a, l = this._data, u = Object.keys(l);
      for (s = u.length; s--; )
        a = u[s],
        this._proxy(a);
      xt(l, this)
    }
    ,
    e.prototype._setData = function(t) {
      t = t || {};
      var e = this._data;
      this._data = t;
      var i, r, o;
      for (i = Object.keys(e),
      o = i.length; o--; )
        r = i[o],
        r in t || this._unproxy(r);
      for (i = Object.keys(t),
      o = i.length; o--; )
        r = i[o],
        n(this, r) || this._proxy(r);
      e.__ob__.removeVm(this),
      xt(t, this),
      this._digest()
    }
    ,
    e.prototype._proxy = function(t) {
      if (!r(t)) {
        var e = this;
        Object.defineProperty(e, t, {
          configurable: !0,
          enumerable: !0,
          get: function() {
            return e._data[t]
          },
          set: function(n) {
            e._data[t] = n
          }
        })
      }
    }
    ,
    e.prototype._unproxy = function(t) {
      r(t) || delete this[t]
    }
    ,
    e.prototype._digest = function() {
      for (var t = 0, e = this._watchers.length; e > t; t++)
        this._watchers[t].update(!0)
    }
    ,
    e.prototype._initComputed = function() {
      var t = this.$options.computed;
      if (t)
        for (var e in t) {
          var n = t[e]
            , r = {
            enumerable: !0,
            configurable: !0
          };
          "function" == typeof n ? (r.get = o(n, this),
          r.set = i) : (r.get = n.get ? n.cache !== !1 ? o(n.get, this) : f(n.get, this) : i,
          r.set = n.set ? f(n.set, this) : i),
          Object.defineProperty(this, e, r)
        }
    }
    ,
    e.prototype._initMethods = function() {
      var t = this.$options.methods;
      if (t)
        for (var e in t)
          this[e] = f(t[e], this)
    }
    ,
    e.prototype._initMeta = function() {
      var t = this.$options._meta;
      if (t)
        for (var e in t)
          kt(this, e, t[e])
    }
  }
  function Ze(t) {
    function e(t, e) {
      for (var n, i, r = e.attributes, o = 0, s = r.length; s > o; o++)
        n = r[o].name,
        ho.test(n) && (n = n.replace(ho, ""),
        i = (t._scope || t._context).$eval(r[o].value, !0),
        t.$on(n.replace(ho), i))
    }
    function n(t, e, n) {
      if (n) {
        var r, o, s, a;
        for (o in n)
          if (r = n[o],
          xn(r))
            for (s = 0,
            a = r.length; a > s; s++)
              i(t, e, o, r[s]);
          else
            i(t, e, o, r)
      }
    }
    function i(t, e, n, r, o) {
      var s = typeof r;
      if ("function" === s)
        t[e](n, r, o);
      else if ("string" === s) {
        var a = t.$options.methods
          , l = a && a[r];
        l ? t[e](n, l, o) : oi('Unknown method: "' + r + '" when registering callback for ' + e + ': "' + n + '".')
      } else
        r && "object" === s && i(t, e, n, r.handler, r)
    }
    function r() {
      this._isAttached || (this._isAttached = !0,
      this.$children.forEach(o))
    }
    function o(t) {
      !t._isAttached && I(t.$el) && t._callHook("attached")
    }
    function s() {
      this._isAttached && (this._isAttached = !1,
      this.$children.forEach(a))
    }
    function a(t) {
      t._isAttached && !I(t.$el) && t._callHook("detached")
    }
    t.prototype._initEvents = function() {
      var t = this.$options;
      t._asComponent && e(this, t.el),
      n(this, "$on", t.events),
      n(this, "$watch", t.watch)
    }
    ,
    t.prototype._initDOMHooks = function() {
      this.$on("hook:attached", r),
      this.$on("hook:detached", s)
    }
    ,
    t.prototype._callHook = function(t) {
      var e = this.$options[t];
      if (e)
        for (var n = 0, i = e.length; i > n; n++)
          e[n].call(this);
      this.$emit("hook:" + t)
    }
  }
  function Ke() {}
  function tn(t, e, n, i, r, o) {
    this.vm = e,
    this.el = n,
    this.descriptor = t,
    this.name = t.name,
    this.expression = t.expression,
    this.arg = t.arg,
    this.modifiers = t.modifiers,
    this.filters = t.filters,
    this.literal = this.modifiers && this.modifiers.literal,
    this._locked = !1,
    this._bound = !1,
    this._listeners = null,
    this._host = i,
    this._scope = r,
    this._frag = o,
    this.el && (this.el._vue_directives = this.el._vue_directives || [],
    this.el._vue_directives.push(this))
  }
  function en(t) {
    t.prototype._updateRef = function(t) {
      var e = this.$options._ref;
      if (e) {
        var n = (this._scope || this._context).$refs;
        t ? n[e] === this && (n[e] = null) : n[e] = this
      }
    }
    ,
    t.prototype._compile = function(t) {
      var e = this.$options
        , n = t;
      t = ze(t, e),
      this._initElement(t);
      var i, r = this._context && this._context.$options, o = Oe(t, e, r), s = this.constructor;
      e._linkerCachable && (i = s.linker,
      i || (i = s.linker = Ce(t, e)));
      var a = o(this, t, this._scope)
        , l = i ? i(this, t) : Ce(t, e)(this, t);
      return this._unlinkFn = function() {
        a(),
        l(!0)
      }
      ,
      e.replace && B(n, t),
      this._isCompiled = !0,
      this._callHook("compiled"),
      t
    }
    ,
    t.prototype._initElement = function(t) {
      t instanceof DocumentFragment ? (this._isFragment = !0,
      this.$el = this._fragmentStart = t.firstChild,
      this._fragmentEnd = t.lastChild,
      3 === this._fragmentStart.nodeType && (this._fragmentStart.data = this._fragmentEnd.data = ""),
      this._fragment = t) : this.$el = t,
      this.$el.__vue__ = this,
      this._callHook("beforeCompile")
    }
    ,
    t.prototype._bindDir = function(t, e, n, i, r) {
      this._directives.push(new tn(t,this,e,n,i,r))
    }
    ,
    t.prototype._destroy = function(t, e) {
      if (this._isBeingDestroyed)
        return void (e || this._cleanup());
      this._callHook("beforeDestroy"),
      this._isBeingDestroyed = !0;
      var n, i = this.$parent;
      for (i && !i._isBeingDestroyed && (i.$children.$remove(this),
      this._updateRef(!0)),
      n = this.$children.length; n--; )
        this.$children[n].$destroy();
      for (this._propsUnlinkFn && this._propsUnlinkFn(),
      this._unlinkFn && this._unlinkFn(),
      n = this._watchers.length; n--; )
        this._watchers[n].teardown();
      this.$el && (this.$el.__vue__ = null);
      var r = this;
      t && this.$el ? this.$remove(function() {
        r._cleanup()
      }) : e || this._cleanup()
    }
    ,
    t.prototype._cleanup = function() {
      this._isDestroyed || (this._frag && this._frag.children.$remove(this),
      this._data.__ob__ && this._data.__ob__.removeVm(this),
      this.$el = this.$parent = this.$root = this.$children = this._watchers = this._context = this._scope = this._directives = null,
      this._isDestroyed = !0,
      this._callHook("destroyed"),
      this.$off())
    }
  }
  function nn(t) {
    t.prototype._applyFilters = function(t, e, n, i) {
      var r, o, s, a, l, u, c, h, d;
      for (u = 0,
      c = n.length; c > u; u++)
        if (r = n[u],
        o = gt(this.$options, "filters", r.name),
        vt(o, "filter", r.name),
        o && (o = i ? o.write : o.read || o,
        "function" == typeof o)) {
          if (s = i ? [t, e] : [t],
          l = i ? 2 : 1,
          r.args)
            for (h = 0,
            d = r.args.length; d > h; h++)
              a = r.args[h],
              s[h + l] = a.dynamic ? this.$get(a.value) : a.value;
          t = o.apply(this, s)
        }
      return t
    }
    ,
    t.prototype._resolveComponent = function(e, n) {
      var i = gt(this.$options, "components", e);
      if (vt(i, "component", e),
      i)
        if (i.options)
          n(i);
        else if (i.resolved)
          n(i.resolved);
        else if (i.requested)
          i.pendingCallbacks.push(n);
        else {
          i.requested = !0;
          var r = i.pendingCallbacks = [n];
          i(function(e) {
            v(e) && (e = t.extend(e)),
            i.resolved = e;
            for (var n = 0, o = r.length; o > n; n++)
              r[n](e)
          }, function(t) {
            oi("Failed to resolve async component: " + e + ". " + (t ? "\nReason: " + t : ""))
          })
        }
    }
  }
  function rn(n) {
    function i(t) {
      return new Function("return function " + d(t) + " (options) { this._init(options) }")()
    }
    n.util = pi,
    n.config = ri,
    n.set = t,
    n["delete"] = e,
    n.nextTick = jn,
    n.compiler = co,
    n.FragmentFactory = he,
    n.internalDirectives = Qr,
    n.parsers = {
      path: Ni,
      text: ei,
      template: Ar,
      directive: Xn,
      expression: Vi
    },
    n.cid = 0;
    var r = 1;
    n.extend = function(t) {
      t = t || {};
      var e = this
        , n = 0 === e.cid;
      if (n && t._Ctor)
        return t._Ctor;
      var o = t.name || e.options.name
        , s = i(o || "VueComponent");
      return s.prototype = Object.create(e.prototype),
      s.prototype.constructor = s,
      s.cid = r++,
      s.options = mt(e.options, t),
      s["super"] = e,
      s.extend = e.extend,
      ri._assetTypes.forEach(function(t) {
        s[t] = e[t]
      }),
      o && (s.options.components[o] = s),
      n && (t._Ctor = s),
      s
    }
    ,
    n.use = function(t) {
      if (!t.installed) {
        var e = p(arguments, 1);
        return e.unshift(this),
        "function" == typeof t.install ? t.install.apply(t, e) : t.apply(null, e),
        t.installed = !0,
        this
      }
    }
    ,
    n.mixin = function(t) {
      n.options = mt(n.options, t)
    }
    ,
    ri._assetTypes.forEach(function(t) {
      n[t] = function(e, i) {
        return i ? ("component" === t && ai.test(e) && oi("Do not use built-in HTML elements as component id: " + e),
        "component" === t && v(i) && (i.name = e,
        i = n.extend(i)),
        this.options[t + "s"][e] = i,
        i) : this.options[t + "s"][e]
      }
    })
  }
  function on(t) {
    function n(t) {
      return JSON.parse(JSON.stringify(t))
    }
    t.prototype.$get = function(t, e) {
      var n = Ft(t);
      if (n) {
        if (e && !It(t)) {
          var i = this;
          return function() {
            n.get.call(i, i)
          }
        }
        try {
          return n.get.call(this, this)
        } catch (r) {}
      }
    }
    ,
    t.prototype.$set = function(t, e) {
      var n = Ft(t, !0);
      n && n.set && n.set.call(this, this, e)
    }
    ,
    t.prototype.$delete = function(t) {
      e(this._data, t)
    }
    ,
    t.prototype.$watch = function(t, e, n) {
      var i, r = this;
      "string" == typeof t && (i = $(t),
      t = i.expression);
      var o = new qt(r,t,e,{
        deep: n && n.deep,
        filters: i && i.filters
      });
      return n && n.immediate && e.call(r, o.value),
      function() {
        o.teardown()
      }
    }
    ,
    t.prototype.$eval = function(t, e) {
      if (fo.test(t)) {
        var n = $(t)
          , i = this.$get(n.expression, e);
        return n.filters ? this._applyFilters(i, null, n.filters) : i
      }
      return this.$get(t, e)
    }
    ,
    t.prototype.$interpolate = function(t) {
      var e = E(t)
        , n = this;
      return e ? 1 === e.length ? n.$eval(e[0].value) + "" : e.map(function(t) {
        return t.tag ? n.$eval(t.value) : t.value
      }).join("") : t
    }
    ,
    t.prototype.$log = function(t) {
      var e = t ? Et(this._data, t) : this._data;
      if (e && (e = n(e)),
      !t)
        for (var i in this.$options.computed)
          e[i] = n(this[i])
    }
  }
  function sn(t) {
    function e(t, e, i, r, o, s) {
      e = n(e);
      var a = !I(e)
        , l = r === !1 || a ? o : s
        , u = !a && !t._isAttached && !I(t.$el);
      return t._isFragment ? (nt(t._fragmentStart, t._fragmentEnd, function(n) {
        l(n, e, t)
      }),
      i && i()) : l(t.$el, e, t, i),
      u && t._callHook("attached"),
      t
    }
    function n(t) {
      return "string" == typeof t ? document.querySelector(t) : t
    }
    function i(t, e, n, i) {
      e.appendChild(t),
      i && i()
    }
    function r(t, e, n, i) {
      W(t, e),
      i && i()
    }
    function o(t, e, n) {
      q(t),
      n && n()
    }
    t.prototype.$nextTick = function(t) {
      jn(t, this)
    }
    ,
    t.prototype.$appendTo = function(t, n, r) {
      return e(this, t, n, r, i, j)
    }
    ,
    t.prototype.$prependTo = function(t, e, i) {
      return t = n(t),
      t.hasChildNodes() ? this.$before(t.firstChild, e, i) : this.$appendTo(t, e, i),
      this
    }
    ,
    t.prototype.$before = function(t, n, i) {
      return e(this, t, n, i, r, M)
    }
    ,
    t.prototype.$after = function(t, e, i) {
      return t = n(t),
      t.nextSibling ? this.$before(t.nextSibling, e, i) : this.$appendTo(t.parentNode, e, i),
      this
    }
    ,
    t.prototype.$remove = function(t, e) {
      if (!this.$el.parentNode)
        return t && t();
      var n = this._isAttached && I(this.$el);
      n || (e = !1);
      var i = this
        , r = function() {
        n && i._callHook("detached"),
        t && t()
      };
      if (this._isFragment)
        it(this._fragmentStart, this._fragmentEnd, this, this._fragment, r);
      else {
        var s = e === !1 ? o : L;
        s(this.$el, this, r)
      }
      return this
    }
  }
  function an(t) {
    function e(t, e, i) {
      var r = t.$parent;
      if (r && i && !n.test(e))
        for (; r; )
          r._eventsCount[e] = (r._eventsCount[e] || 0) + i,
          r = r.$parent
    }
    t.prototype.$on = function(t, n) {
      return (this._events[t] || (this._events[t] = [])).push(n),
      e(this, t, 1),
      this
    }
    ,
    t.prototype.$once = function(t, e) {
      function n() {
        i.$off(t, n),
        e.apply(this, arguments)
      }
      var i = this;
      return n.fn = e,
      this.$on(t, n),
      this
    }
    ,
    t.prototype.$off = function(t, n) {
      var i;
      if (!arguments.length) {
        if (this.$parent)
          for (t in this._events)
            i = this._events[t],
            i && e(this, t, -i.length);
        return this._events = {},
        this
      }
      if (i = this._events[t],
      !i)
        return this;
      if (1 === arguments.length)
        return e(this, t, -i.length),
        this._events[t] = null,
        this;
      for (var r, o = i.length; o--; )
        if (r = i[o],
        r === n || r.fn === n) {
          e(this, t, -1),
          i.splice(o, 1);
          break
        }
      return this
    }
    ,
    t.prototype.$emit = function(t) {
      var e = this._events[t]
        , n = !e;
      if (e) {
        e = e.length > 1 ? p(e) : e;
        for (var i = p(arguments, 1), r = 0, o = e.length; o > r; r++) {
          var s = e[r].apply(this, i);
          s === !0 && (n = !0)
        }
      }
      return n
    }
    ,
    t.prototype.$broadcast = function(t) {
      if (this._eventsCount[t]) {
        for (var e = this.$children, n = 0, i = e.length; i > n; n++) {
          var r = e[n]
            , o = r.$emit.apply(r, arguments);
          o && r.$broadcast.apply(r, arguments)
        }
        return this
      }
    }
    ,
    t.prototype.$dispatch = function() {
      this.$emit.apply(this, arguments);
      for (var t = this.$parent; t; ) {
        var e = t.$emit.apply(t, arguments);
        t = e ? t.$parent : null
      }
      return this
    }
    ;
    var n = /^hook:/
  }
  function ln(t) {
    function e() {
      this._isAttached = !0,
      this._isReady = !0,
      this._callHook("ready")
    }
    t.prototype.$mount = function(t) {
      return this._isCompiled ? void oi("$mount() should be called only once.") : (t = F(t),
      t || (t = document.createElement("div")),
      this._compile(t),
      this._initDOMHooks(),
      I(this.$el) ? (this._callHook("attached"),
      e.call(this)) : this.$once("hook:attached", e),
      this)
    }
    ,
    t.prototype.$destroy = function(t, e) {
      this._destroy(t, e)
    }
    ,
    t.prototype.$compile = function(t, e, n, i) {
      return Ce(t, this.$options, !0)(this, t, e, n, i)
    }
  }
  function un(t) {
    this._init(t)
  }
  function cn(t, e, n) {
    return n = n ? parseInt(n, 10) : 0,
    "number" == typeof e ? t.slice(n, n + e) : t
  }
  function hn(t, e, n) {
    if (t = po(t),
    null == e)
      return t;
    if ("function" == typeof e)
      return t.filter(e);
    e = ("" + e).toLowerCase();
    for (var i, r, o, s, a = "in" === n ? 3 : 2, l = p(arguments, a).reduce(function(t, e) {
      return t.concat(e)
    }, []), u = [], c = 0, h = t.length; h > c; c++)
      if (i = t[c],
      o = i && i.$value || i,
      s = l.length) {
        for (; s--; )
          if (r = l[s],
          "$key" === r && fn(i.$key, e) || fn(Et(o, r), e)) {
            u.push(i);
            break
          }
      } else
        fn(i, e) && u.push(i);
    return u
  }
  function dn(t, e, n) {
    if (t = po(t),
    !e)
      return t;
    var i = n && 0 > n ? -1 : 1;
    return t.slice().sort(function(t, n) {
      return "$key" !== e && (g(t) && "$value"in t && (t = t.$value),
      g(n) && "$value"in n && (n = n.$value)),
      t = g(t) ? Et(t, e) : t,
      n = g(n) ? Et(n, e) : n,
      t === n ? 0 : t > n ? i : -i
    })
  }
  function fn(t, e) {
    var n;
    if (v(t)) {
      var i = Object.keys(t);
      for (n = i.length; n--; )
        if (fn(t[i[n]], e))
          return !0
    } else if (xn(t)) {
      for (n = t.length; n--; )
        if (fn(t[n], e))
          return !0
    } else if (null != t)
      return t.toString().toLowerCase().indexOf(e) > -1
  }
  function pn(t, e, n) {
    function i(t) {
      !K(t) || t.hasAttribute("v-if") || t.hasAttribute("v-for") || (t = ne(t)),
      t = ee(t),
      r.appendChild(t)
    }
    for (var r = document.createDocumentFragment(), o = 0, s = t.length; s > o; o++) {
      var a = t[o];
      n && !a.__v_selected ? i(a) : n || a.parentNode !== e || (a.__v_selected = !0,
      i(a))
    }
    return r
  }
  var mn = Object.prototype.hasOwnProperty
    , gn = /^\s?(true|false|[\d\.]+|'[^']*'|"[^"]*")\s?$/
    , vn = /-(\w)/g
    , yn = /([a-z\d])([A-Z])/g
    , bn = /(?:^|[-_\/])(\w)/g
    , _n = Object.prototype.toString
    , wn = "[object Object]"
    , xn = Array.isArray
    , kn = "__proto__"in {}
    , Cn = "undefined" != typeof window && "[object Object]" !== Object.prototype.toString.call(window)
    , Tn = Cn && navigator.userAgent.toLowerCase().indexOf("msie 9.0") > 0
    , $n = Cn && navigator.userAgent.toLowerCase().indexOf("android") > 0
    , Sn = void 0
    , Dn = void 0
    , En = void 0
    , On = void 0;
  if (Cn && !Tn) {
    var An = void 0 === window.ontransitionend && void 0 !== window.onwebkittransitionend
      , Nn = void 0 === window.onanimationend && void 0 !== window.onwebkitanimationend;
    Sn = An ? "WebkitTransition" : "transition",
    Dn = An ? "webkitTransitionEnd" : "transitionend",
    En = Nn ? "WebkitAnimation" : "animation",
    On = Nn ? "webkitAnimationEnd" : "animationend"
  }
  var jn = function() {
    function t() {
      i = !1;
      var t = n.slice(0);
      n = [];
      for (var e = 0; e < t.length; e++)
        t[e]()
    }
    var e, n = [], i = !1;
    if ("undefined" != typeof MutationObserver) {
      var r = 1
        , o = new MutationObserver(t)
        , s = document.createTextNode(r);
      o.observe(s, {
        characterData: !0
      }),
      e = function() {
        r = (r + 1) % 2,
        s.data = r
      }
    } else
      e = setTimeout;
    return function(r, o) {
      var s = o ? function() {
        r.call(o)
      }
      : r;
      n.push(s),
      i || (i = !0,
      e(t, 0))
    }
  }()
    , Mn = k.prototype;
  Mn.put = function(t, e) {
    var n = {
      key: t,
      value: e
    };
    return this._keymap[t] = n,
    this.tail ? (this.tail.newer = n,
    n.older = this.tail) : this.head = n,
    this.tail = n,
    this.size === this.limit ? this.shift() : void this.size++
  }
  ,
  Mn.shift = function() {
    var t = this.head;
    return t && (this.head = this.head.newer,
    this.head.older = void 0,
    t.newer = t.older = void 0,
    this._keymap[t.key] = void 0),
    t
  }
  ,
  Mn.get = function(t, e) {
    var n = this._keymap[t];
    if (void 0 !== n)
      return n === this.tail ? e ? n : n.value : (n.newer && (n === this.head && (this.head = n.newer),
      n.newer.older = n.older),
      n.older && (n.older.newer = n.newer),
      n.newer = void 0,
      n.older = this.tail,
      this.tail && (this.tail.newer = n),
      this.tail = n,
      e ? n : n.value)
  }
  ;
  var Ln, Pn, Fn, In, Hn, Rn, Wn, Yn, qn, Un, Bn, Vn = new k(1e3), zn = /[^\s'"]+|'[^']*'|"[^"]*"/g, Gn = /^in$|^-?\d+/, Xn = Object.freeze({
    parseDirective: $
  }), Jn = /[-.*+?^${}()|[\]\/\\]/g, Qn = void 0, Zn = void 0, Kn = void 0, ti = /[^|]\|[^|]/, ei = Object.freeze({
    compileRegex: D,
    parseText: E,
    tokensToExp: O
  }), ni = ["{{", "}}"], ii = ["{{{", "}}}"], ri = Object.defineProperties({
    debug: !1,
    silent: !1,
    async: !0,
    warnExpressionErrors: !0,
    convertAllProperties: !1,
    _delimitersChanged: !0,
    _assetTypes: ["component", "directive", "elementDirective", "filter", "transition", "partial"],
    _propBindingModes: {
      ONE_WAY: 0,
      TWO_WAY: 1,
      ONE_TIME: 2
    },
    _maxUpdateCount: 100
  }, {
    delimiters: {
      get: function() {
        return ni
      },
      set: function(t) {
        ni = t,
        D()
      },
      configurable: !0,
      enumerable: !0
    },
    unsafeDelimiters: {
      get: function() {
        return ii
      },
      set: function(t) {
        ii = t,
        D()
      },
      configurable: !0,
      enumerable: !0
    }
  }), oi = void 0;
  !function() {
    var t = "undefined" != typeof console;
    oi = function(e, n) {
      if (t && (!ri.silent || ri.debug) && ri.debug && n)
        throw n
    }
  }();
  var si = /^v-ref:/
    , ai = /^(div|p|span|img|a|b|i|br|ul|ol|li|h1|h2|h3|h4|h5|h6|code|pre|table|th|td|tr|form|label|input|select|option|nav|article|section|header|footer)$/
    , li = ri.optionMergeStrategies = Object.create(null);
  li.data = function(t, e, n) {
    return n ? t || e ? function() {
      var i = "function" == typeof e ? e.call(n) : e
        , r = "function" == typeof t ? t.call(n) : void 0;
      return i ? ct(i, r) : r
    }
    : void 0 : e ? "function" != typeof e ? (oi('The "data" option should be a function that returns a per-instance value in component definitions.'),
    t) : t ? function() {
      return ct(e.call(this), t.call(this))
    }
    : e : t
  }
  ,
  li.el = function(t, e, n) {
    if (!n && e && "function" != typeof e)
      return void oi('The "el" option should be a function that returns a per-instance value in component definitions.');
    var i = e || t;
    return n && "function" == typeof i ? i.call(n) : i
  }
  ,
  li.init = li.created = li.ready = li.attached = li.detached = li.beforeCompile = li.compiled = li.beforeDestroy = li.destroyed = function(t, e) {
    return e ? t ? t.concat(e) : xn(e) ? e : [e] : t
  }
  ,
  li.paramAttributes = function() {
    oi('"paramAttributes" option has been deprecated in 0.12. Use "props" instead.')
  }
  ,
  ri._assetTypes.forEach(function(t) {
    li[t + "s"] = ht
  }),
  li.watch = li.events = function(t, e) {
    if (!e)
      return t;
    if (!t)
      return e;
    var n = {};
    m(n, t);
    for (var i in e) {
      var r = n[i]
        , o = e[i];
      r && !xn(r) && (r = [r]),
      n[i] = r ? r.concat(o) : [o]
    }
    return n
  }
  ,
  li.props = li.methods = li.computed = function(t, e) {
    if (!e)
      return t;
    if (!t)
      return e;
    var n = Object.create(null);
    return m(n, t),
    m(n, e),
    n
  }
  ;
  var ui = function(t, e) {
    return void 0 === e ? t : e
  }
    , ci = Array.prototype
    , hi = Object.create(ci);
  ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"].forEach(function(t) {
    var e = ci[t];
    y(hi, t, function() {
      for (var n = arguments.length, i = new Array(n); n--; )
        i[n] = arguments[n];
      var r, o = e.apply(this, i), s = this.__ob__;
      switch (t) {
      case "push":
        r = i;
        break;
      case "unshift":
        r = i;
        break;
      case "splice":
        r = i.slice(2)
      }
      return r && s.observeArray(r),
      s.dep.notify(),
      o
    })
  }),
  y(ci, "$set", function(t, e) {
    return t >= this.length && (this.length = t + 1),
    this.splice(t, 1, e)[0]
  }),
  y(ci, "$remove", function(t) {
    if (this.length) {
      var e = _(this, t);
      return e > -1 ? this.splice(e, 1) : void 0
    }
  });
  var di = 0;
  yt.target = null,
  yt.prototype.addSub = function(t) {
    this.subs.push(t)
  }
  ,
  yt.prototype.removeSub = function(t) {
    this.subs.$remove(t)
  }
  ,
  yt.prototype.depend = function() {
    yt.target.addDep(this)
  }
  ,
  yt.prototype.notify = function() {
    for (var t = p(this.subs), e = 0, n = t.length; n > e; e++)
      t[e].update()
  }
  ;
  var fi = Object.getOwnPropertyNames(hi);
  bt.prototype.walk = function(t) {
    for (var e = Object.keys(t), n = e.length; n--; )
      this.convert(e[n], t[e[n]])
  }
  ,
  bt.prototype.observeArray = function(t) {
    for (var e = t.length; e--; )
      xt(t[e])
  }
  ,
  bt.prototype.convert = function(t, e) {
    kt(this.value, t, e)
  }
  ,
  bt.prototype.addVm = function(t) {
    (this.vms || (this.vms = [])).push(t)
  }
  ,
  bt.prototype.removeVm = function(t) {
    this.vms.$remove(t)
  }
  ;
  var pi = Object.freeze({
    defineReactive: kt,
    set: t,
    del: e,
    hasOwn: n,
    isLiteral: i,
    isReserved: r,
    _toString: o,
    toNumber: s,
    toBoolean: a,
    stripQuotes: l,
    camelize: u,
    hyphenate: h,
    classify: d,
    bind: f,
    toArray: p,
    extend: m,
    isObject: g,
    isPlainObject: v,
    def: y,
    debounce: b,
    indexOf: _,
    cancellable: w,
    looseEqual: x,
    isArray: xn,
    hasProto: kn,
    inBrowser: Cn,
    isIE9: Tn,
    isAndroid: $n,
    get transitionProp() {
      return Sn
    },
    get transitionEndEvent() {
      return Dn
    },
    get animationProp() {
      return En
    },
    get animationEndEvent() {
      return On
    },
    nextTick: jn,
    query: F,
    inDoc: I,
    getAttr: H,
    getBindAttr: R,
    before: W,
    after: Y,
    remove: q,
    prepend: U,
    replace: B,
    on: V,
    off: z,
    addClass: G,
    removeClass: X,
    extractContent: J,
    trimNode: Q,
    isTemplate: K,
    createAnchor: tt,
    findRef: et,
    mapNodeRange: nt,
    removeNodeRange: it,
    mergeOptions: mt,
    resolveAsset: gt,
    assertAsset: vt,
    checkComponentAttr: rt,
    initProp: st,
    assertProp: at,
    commonTagRE: ai,
    get warn() {
      return oi
    }
  })
    , mi = 0
    , gi = new k(1e3)
    , vi = 0
    , yi = 1
    , bi = 2
    , _i = 3
    , wi = 0
    , xi = 1
    , ki = 2
    , Ci = 3
    , Ti = 4
    , $i = 5
    , Si = 6
    , Di = 7
    , Ei = 8
    , Oi = [];
  Oi[wi] = {
    ws: [wi],
    ident: [Ci, vi],
    "[": [Ti],
    eof: [Di]
  },
  Oi[xi] = {
    ws: [xi],
    ".": [ki],
    "[": [Ti],
    eof: [Di]
  },
  Oi[ki] = {
    ws: [ki],
    ident: [Ci, vi]
  },
  Oi[Ci] = {
    ident: [Ci, vi],
    0: [Ci, vi],
    number: [Ci, vi],
    ws: [xi, yi],
    ".": [ki, yi],
    "[": [Ti, yi],
    eof: [Di, yi]
  },
  Oi[Ti] = {
    "'": [$i, vi],
    '"': [Si, vi],
    "[": [Ti, bi],
    "]": [xi, _i],
    eof: Ei,
    "else": [Ti, vi]
  },
  Oi[$i] = {
    "'": [Ti, vi],
    eof: Ei,
    "else": [$i, vi]
  },
  Oi[Si] = {
    '"': [Ti, vi],
    eof: Ei,
    "else": [Si, vi]
  };
  var Ai;
  Ai = function(t) {
    oi('You are setting a non-existent path "' + t.raw + '" on a vm instance. Consider pre-initializing the property with the "data" option for more reliable reactivity and better performance.')
  }
  ;
  var Ni = Object.freeze({
    parsePath: Dt,
    getPath: Et,
    setPath: Ot
  })
    , ji = new k(1e3)
    , Mi = "Math,Date,this,true,false,null,undefined,Infinity,NaN,isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,parseInt,parseFloat"
    , Li = new RegExp("^(" + Mi.replace(/,/g, "\\b|") + "\\b)")
    , Pi = "break,case,class,catch,const,continue,debugger,default,delete,do,else,export,extends,finally,for,function,if,import,in,instanceof,let,return,super,switch,throw,try,var,while,with,yield,enum,await,implements,package,proctected,static,interface,private,public"
    , Fi = new RegExp("^(" + Pi.replace(/,/g, "\\b|") + "\\b)")
    , Ii = /\s/g
    , Hi = /\n/g
    , Ri = /[\{,]\s*[\w\$_]+\s*:|('[^']*'|"[^"]*")|new |typeof |void /g
    , Wi = /"(\d+)"/g
    , Yi = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/
    , qi = /[^\w$\.]([A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\])*)/g
    , Ui = /^(true|false)$/
    , Bi = []
    , Vi = Object.freeze({
    parseExpression: Ft,
    isSimplePath: It
  })
    , zi = []
    , Gi = []
    , Xi = {}
    , Ji = {}
    , Qi = !1
    , Zi = !1
    , Ki = 0;
  qt.prototype.addDep = function(t) {
    var e = t.id;
    this.newDeps[e] || (this.newDeps[e] = t,
    this.deps[e] || (this.deps[e] = t,
    t.addSub(this)))
  }
  ,
  qt.prototype.get = function() {
    this.beforeGet();
    var t, e = this.scope || this.vm;
    try {
      t = this.getter.call(e, e)
    } catch (n) {
      ri.warnExpressionErrors && oi('Error when evaluating expression "' + this.expression + '". ' + (ri.debug ? "" : "Turn on debug mode to see stack trace."), n)
    }
    return this.deep && Ut(t),
    this.preProcess && (t = this.preProcess(t)),
    this.filters && (t = e._applyFilters(t, null, this.filters, !1)),
    this.postProcess && (t = this.postProcess(t)),
    this.afterGet(),
    t
  }
  ,
  qt.prototype.set = function(t) {
    var e = this.scope || this.vm;
    this.filters && (t = e._applyFilters(t, this.value, this.filters, !0));
    try {
      this.setter.call(e, e, t)
    } catch (n) {
      ri.warnExpressionErrors && oi('Error when evaluating setter "' + this.expression + '"', n)
    }
    var i = e.$forContext;
    if (i && i.alias === this.expression) {
      if (i.filters)
        return void oi("It seems you are using two-way binding on a v-for alias (" + this.expression + "), and the v-for has filters. This will not work properly. Either remove the filters or use an array of objects and bind to object properties instead.");
      i._withLock(function() {
        e.$key ? i.rawValue[e.$key] = t : i.rawValue.$set(e.$index, t)
      })
    }
  }
  ,
  qt.prototype.beforeGet = function() {
    yt.target = this,
    this.newDeps = Object.create(null)
  }
  ,
  qt.prototype.afterGet = function() {
    yt.target = null;
    for (var t = Object.keys(this.deps), e = t.length; e--; ) {
      var n = t[e];
      this.newDeps[n] || this.deps[n].removeSub(this)
    }
    this.deps = this.newDeps
  }
  ,
  qt.prototype.update = function(t) {
    this.lazy ? this.dirty = !0 : this.sync || !ri.async ? this.run() : (this.shallow = this.queued ? t ? this.shallow : !1 : !!t,
    this.queued = !0,
    ri.debug && (this.prevError = new Error("[vue] async stack trace")),
    Yt(this))
  }
  ,
  qt.prototype.run = function() {
    if (this.active) {
      var t = this.get();
      if (t !== this.value || (xn(t) || this.deep) && !this.shallow) {
        var e = this.value;
        this.value = t;
        var n = this.prevError;
        if (ri.debug && n) {
          this.prevError = null;
          try {
            this.cb.call(this.vm, t, e)
          } catch (i) {
            throw jn(function() {
              throw n
            }, 0),
            i
          }
        } else
          this.cb.call(this.vm, t, e)
      }
      this.queued = this.shallow = !1
    }
  }
  ,
  qt.prototype.evaluate = function() {
    var t = yt.target;
    this.value = this.get(),
    this.dirty = !1,
    yt.target = t
  }
  ,
  qt.prototype.depend = function() {
    for (var t = Object.keys(this.deps), e = t.length; e--; )
      this.deps[t[e]].depend()
  }
  ,
  qt.prototype.teardown = function() {
    if (this.active) {
      this.vm._isBeingDestroyed || this.vm._watchers.$remove(this);
      for (var t = Object.keys(this.deps), e = t.length; e--; )
        this.deps[t[e]].removeSub(this);
      this.active = !1,
      this.vm = this.cb = this.value = null
    }
  }
  ;
  var tr = {
    bind: function() {
      var t = this.el;
      this.vm.$once("hook:compiled", function() {
        t.removeAttribute("v-cloak")
      })
    }
  }
    , er = {
    bind: function() {
      oi("v-ref:" + this.arg + " must be used on a child component. Found on <" + this.el.tagName.toLowerCase() + ">.")
    }
  }
    , nr = {
    priority: 1500,
    bind: function() {
      if (this.arg) {
        var t = this.id = u(this.arg)
          , e = (this._scope || this.vm).$els;
        n(e, t) ? e[t] = this.el : kt(e, t, this.el)
      }
    },
    unbind: function() {
      var t = (this._scope || this.vm).$els;
      t[this.id] === this.el && (t[this.id] = null)
    }
  }
    , ir = ["-webkit-", "-moz-", "-ms-"]
    , rr = ["Webkit", "Moz", "ms"]
    , or = /!important;?$/
    , sr = Object.create(null)
    , ar = null
    , lr = {
    deep: !0,
    update: function(t) {
      "string" == typeof t ? this.el.style.cssText = t : xn(t) ? this.handleObject(t.reduce(m, {})) : this.handleObject(t || {})
    },
    handleObject: function(t) {
      var e, n, i = this.cache || (this.cache = {});
      for (e in i)
        e in t || (this.handleSingle(e, null),
        delete i[e]);
      for (e in t)
        n = t[e],
        n !== i[e] && (i[e] = n,
        this.handleSingle(e, n))
    },
    handleSingle: function(t, e) {
      if (t = Bt(t))
        if (null != e && (e += ""),
        e) {
          var n = or.test(e) ? "important" : "";
          n && (e = e.replace(or, "").trim()),
          this.el.style.setProperty(t, e, n)
        } else
          this.el.style.removeProperty(t)
    }
  }
    , ur = "http://www.w3.org/1999/xlink"
    , cr = /^xlink:/
    , hr = {
    value: 1,
    checked: 1,
    selected: 1
  }
    , dr = {
    value: "_value",
    "true-value": "_trueValue",
    "false-value": "_falseValue"
  }
    , fr = /^v-|^:|^@|^(is|transition|transition-mode|debounce|track-by|stagger|enter-stagger|leave-stagger)$/
    , pr = {
    priority: 850,
    bind: function() {
      var t = this.arg
        , e = this.el.tagName;
      if (t || (this.deep = !0),
      this.descriptor.interp) {
        (fr.test(t) || "name" === t && ("PARTIAL" === e || "SLOT" === e)) && (oi(t + '="' + this.descriptor.raw + '": attribute interpolation is not allowed in Vue.js directives and special attributes.'),
        this.el.removeAttribute(t),
        this.invalid = !0);
        var n = t + '="' + this.descriptor.raw + '": ';
        "src" === t && oi(n + 'interpolation in "src" attribute will cause a 404 request. Use v-bind:src instead.'),
        "style" === t && oi(n + 'interpolation in "style" attribute will cause the attribute to be discarded in Internet Explorer. Use v-bind:style instead.')
      }
    },
    update: function(t) {
      if (!this.invalid) {
        var e = this.arg;
        this.arg ? this.handleSingle(e, t) : this.handleObject(t || {})
      }
    },
    handleObject: lr.handleObject,
    handleSingle: function(t, e) {
      hr[t] && t in this.el && (this.el[t] = "value" === t ? e || "" : e);
      var n = dr[t];
      if (n) {
        this.el[n] = e;
        var i = this.el.__v_model;
        i && i.listener()
      }
      return "value" === t && "TEXTAREA" === this.el.tagName ? void this.el.removeAttribute(t) : void (null != e && e !== !1 ? cr.test(t) ? this.el.setAttributeNS(ur, t, e) : this.el.setAttribute(t, e) : this.el.removeAttribute(t))
    }
  }
    , mr = {
    esc: 27,
    tab: 9,
    enter: 13,
    space: 32,
    "delete": 46,
    up: 38,
    left: 37,
    right: 39,
    down: 40
  }
    , gr = {
    acceptStatement: !0,
    priority: 700,
    bind: function() {
      if ("IFRAME" === this.el.tagName && "load" !== this.arg) {
        var t = this;
        this.iframeBind = function() {
          V(t.el.contentWindow, t.arg, t.handler)
        }
        ,
        this.on("load", this.iframeBind)
      }
    },
    update: function(t) {
      if (this.descriptor.raw || (t = function() {}
      ),
      "function" != typeof t)
        return void oi("v-on:" + this.arg + '="' + this.expression + '" expects a function value, got ' + t);
      this.modifiers.stop && (t = Gt(t)),
      this.modifiers.prevent && (t = Xt(t));
      var e = Object.keys(this.modifiers).filter(function(t) {
        return "stop" !== t && "prevent" !== t
      });
      e.length && (t = zt(t, e)),
      this.reset(),
      this.handler = t,
      this.iframeBind ? this.iframeBind() : V(this.el, this.arg, this.handler)
    },
    reset: function() {
      var t = this.iframeBind ? this.el.contentWindow : this.el;
      this.handler && z(t, this.arg, this.handler)
    },
    unbind: function() {
      this.reset()
    }
  }
    , vr = {
    bind: function() {
      function t() {
        var t = n.checked;
        return t && n.hasOwnProperty("_trueValue") ? n._trueValue : !t && n.hasOwnProperty("_falseValue") ? n._falseValue : t
      }
      var e = this
        , n = this.el;
      this.getValue = function() {
        return n.hasOwnProperty("_value") ? n._value : e.params.number ? s(n.value) : n.value
      }
      ,
      this.listener = function() {
        var i = e._watcher.value;
        if (xn(i)) {
          var r = e.getValue();
          n.checked ? _(i, r) < 0 && i.push(r) : i.$remove(r)
        } else
          e.set(t())
      }
      ,
      this.on("change", this.listener),
      n.checked && (this.afterBind = this.listener)
    },
    update: function(t) {
      var e = this.el;
      xn(t) ? e.checked = _(t, this.getValue()) > -1 : e.hasOwnProperty("_trueValue") ? e.checked = x(t, e._trueValue) : e.checked = !!t
    }
  }
    , yr = {
    bind: function() {
      var t = this
        , e = this.el;
      this.forceUpdate = function() {
        t._watcher && t.update(t._watcher.get())
      }
      ;
      var n = this.multiple = e.hasAttribute("multiple");
      this.listener = function() {
        var i = Jt(e, n);
        i = t.params.number ? xn(i) ? i.map(s) : s(i) : i,
        t.set(i)
      }
      ,
      this.on("change", this.listener);
      var i = Jt(e, n, !0);
      (n && i.length || !n && null !== i) && (this.afterBind = this.listener),
      this.vm.$on("hook:attached", this.forceUpdate)
    },
    update: function(t) {
      var e = this.el;
      e.selectedIndex = -1;
      for (var n, i, r = this.multiple && xn(t), o = e.options, s = o.length; s--; )
        n = o[s],
        i = n.hasOwnProperty("_value") ? n._value : n.value,
        n.selected = r ? Qt(t, i) > -1 : x(t, i)
    },
    unbind: function() {
      this.vm.$off("hook:attached", this.forceUpdate)
    }
  }
    , br = {
    bind: function() {
      var t = this
        , e = this.el;
      this.getValue = function() {
        if (e.hasOwnProperty("_value"))
          return e._value;
        var n = e.value;
        return t.params.number && (n = s(n)),
        n
      }
      ,
      this.listener = function() {
        t.set(t.getValue())
      }
      ,
      this.on("change", this.listener),
      e.checked && (this.afterBind = this.listener)
    },
    update: function(t) {
      this.el.checked = x(t, this.getValue())
    }
  }
    , _r = {
    bind: function() {
      var t = this
        , e = this.el
        , n = "range" === e.type
        , i = this.params.lazy
        , r = this.params.number
        , o = this.params.debounce
        , a = !1;
      $n || n || (this.on("compositionstart", function() {
        a = !0
      }),
      this.on("compositionend", function() {
        a = !1,
        i || t.listener()
      })),
      this.focused = !1,
      n || (this.on("focus", function() {
        t.focused = !0
      }),
      this.on("blur", function() {
        t.focused = !1,
        t.listener()
      })),
      this.listener = function() {
        if (!a) {
          var i = r || n ? s(e.value) : e.value;
          t.set(i),
          jn(function() {
            t._bound && !t.focused && t.update(t._watcher.value)
          })
        }
      }
      ,
      o && (this.listener = b(this.listener, o)),
      this.hasjQuery = "function" == typeof jQuery,
      this.hasjQuery ? (jQuery(e).on("change", this.listener),
      i || jQuery(e).on("input", this.listener)) : (this.on("change", this.listener),
      i || this.on("input", this.listener)),
      !i && Tn && (this.on("cut", function() {
        jn(t.listener)
      }),
      this.on("keyup", function(e) {
        (46 === e.keyCode || 8 === e.keyCode) && t.listener()
      })),
      (e.hasAttribute("value") || "TEXTAREA" === e.tagName && e.value.trim()) && (this.afterBind = this.listener)
    },
    update: function(t) {
      this.el.value = o(t)
    },
    unbind: function() {
      var t = this.el;
      this.hasjQuery && (jQuery(t).off("change", this.listener),
      jQuery(t).off("input", this.listener))
    }
  }
    , wr = {
    text: _r,
    radio: br,
    select: yr,
    checkbox: vr
  }
    , xr = {
    priority: 800,
    twoWay: !0,
    handlers: wr,
    params: ["lazy", "number", "debounce"],
    bind: function() {
      this.checkFilters(),
      this.hasRead && !this.hasWrite && oi("It seems you are using a read-only filter with v-model. You might want to use a two-way filter to ensure correct behavior.");
      var t, e = this.el, n = e.tagName;
      if ("INPUT" === n)
        t = wr[e.type] || wr.text;
      else if ("SELECT" === n)
        t = wr.select;
      else {
        if ("TEXTAREA" !== n)
          return void oi("v-model does not support element type: " + n);
        t = wr.text
      }
      e.__v_model = this,
      t.bind.call(this),
      this.update = t.update,
      this._unbind = t.unbind
    },
    checkFilters: function() {
      var t = this.filters;
      if (t)
        for (var e = t.length; e--; ) {
          var n = gt(this.vm.$options, "filters", t[e].name);
          ("function" == typeof n || n.read) && (this.hasRead = !0),
          n.write && (this.hasWrite = !0)
        }
    },
    unbind: function() {
      this.el.__v_model = null,
      this._unbind && this._unbind()
    }
  }
    , kr = {
    bind: function() {
      var t = this.el.nextElementSibling;
      t && null !== H(t, "v-else") && (this.elseEl = t)
    },
    update: function(t) {
      this.apply(this.el, t),
      this.elseEl && this.apply(this.elseEl, !t)
    },
    apply: function(t, e) {
      P(t, e ? 1 : -1, function() {
        t.style.display = e ? "" : "none"
      }, this.vm)
    }
  }
    , Cr = new k(1e3)
    , Tr = new k(1e3)
    , $r = {
    efault: [0, "", ""],
    legend: [1, "<fieldset>", "</fieldset>"],
    tr: [2, "<table><tbody>", "</tbody></table>"],
    col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"]
  };
  $r.td = $r.th = [3, "<table><tbody><tr>", "</tr></tbody></table>"],
  $r.option = $r.optgroup = [1, '<select multiple="multiple">', "</select>"],
  $r.thead = $r.tbody = $r.colgroup = $r.caption = $r.tfoot = [1, "<table>", "</table>"],
  $r.g = $r.defs = $r.symbol = $r.use = $r.image = $r.text = $r.circle = $r.ellipse = $r.line = $r.path = $r.polygon = $r.polyline = $r.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events"version="1.1">', "</svg>"];
  var Sr = /<([\w:]+)/
    , Dr = /&\w+;|&#\d+;|&#x[\dA-F]+;/
    , Er = function() {
    if (Cn) {
      var t = document.createElement("div");
      return t.innerHTML = "<template>1</template>",
      !t.cloneNode(!0).firstChild.innerHTML
    }
    return !1
  }()
    , Or = function() {
    if (Cn) {
      var t = document.createElement("textarea");
      return t.placeholder = "t",
      "t" === t.cloneNode(!0).value
    }
    return !1
  }()
    , Ar = Object.freeze({
    cloneNode: ee,
    parseTemplate: ne
  });
  ie.prototype.callHook = function(t) {
    var e, n;
    for (e = 0,
    n = this.children.length; n > e; e++)
      t(this.children[e]);
    for (e = 0,
    n = this.childFrags.length; n > e; e++)
      this.childFrags[e].callHook(t)
  }
  ,
  ie.prototype.destroy = function() {
    this.parentFrag && this.parentFrag.childFrags.$remove(this),
    this.unlink()
  }
  ;
  var Nr = new k(5e3);
  he.prototype.create = function(t, e, n) {
    var i = ee(this.template);
    return new ie(this.linker,this.vm,i,t,e,n)
  }
  ;
  var jr = {
    priority: 2e3,
    bind: function() {
      var t = this.el;
      if (t.__vue__)
        oi('v-if="' + this.expression + '" cannot be used on an instance root element.'),
        this.invalid = !0;
      else {
        var e = t.nextElementSibling;
        e && null !== H(e, "v-else") && (q(e),
        this.elseFactory = new he(this.vm,e)),
        this.anchor = tt("v-if"),
        B(t, this.anchor),
        this.factory = new he(this.vm,t)
      }
    },
    update: function(t) {
      this.invalid || (t ? this.frag || this.insert() : this.remove())
    },
    insert: function() {
      this.elseFrag && (this.elseFrag.remove(),
      this.elseFrag = null),
      this.frag = this.factory.create(this._host, this._scope, this._frag),
      this.frag.before(this.anchor)
    },
    remove: function() {
      this.frag && (this.frag.remove(),
      this.frag = null),
      this.elseFactory && !this.elseFrag && (this.elseFrag = this.elseFactory.create(this._host, this._scope, this._frag),
      this.elseFrag.before(this.anchor))
    },
    unbind: function() {
      this.frag && this.frag.destroy()
    }
  }
    , Mr = 0
    , Lr = {
    priority: 2e3,
    params: ["track-by", "stagger", "enter-stagger", "leave-stagger"],
    bind: function() {
      var t = this.expression.match(/(.*) in (.*)/);
      if (t) {
        var e = t[1].match(/\((.*),(.*)\)/);
        e ? (this.iterator = e[1].trim(),
        this.alias = e[2].trim()) : this.alias = t[1].trim(),
        this.expression = t[2]
      }
      if (!this.alias)
        return void oi("Alias is required in v-for.");
      this.id = "__v-for__" + ++Mr;
      var n = this.el.tagName;
      this.isOption = ("OPTION" === n || "OPTGROUP" === n) && "SELECT" === this.el.parentNode.tagName,
      this.start = tt("v-for-start"),
      this.end = tt("v-for-end"),
      B(this.el, this.end),
      W(this.start, this.end),
      this.cache = Object.create(null),
      this.factory = new he(this.vm,this.el)
    },
    update: function(t) {
      this.diff(t),
      this.updateRef(),
      this.updateModel()
    },
    diff: function(t) {
      var e, i, r, o, s, a, l = t[0], u = this.fromObject = g(l) && n(l, "$key") && n(l, "$value"), c = this.params.trackBy, h = this.frags, d = this.frags = new Array(t.length), f = this.alias, p = this.iterator, m = this.start, v = this.end, y = I(m), b = !h;
      for (e = 0,
      i = t.length; i > e; e++)
        l = t[e],
        o = u ? l.$key : null,
        s = u ? l.$value : l,
        a = !g(s),
        r = !b && this.getCachedFrag(s, e, o),
        r ? (r.reused = !0,
        r.scope.$index = e,
        o && (r.scope.$key = o),
        p && (r.scope[p] = null !== o ? o : e),
        (c || u || a) && (r.scope[f] = s)) : (r = this.create(s, f, e, o),
        r.fresh = !b),
        d[e] = r,
        b && r.before(v);
      if (!b) {
        var _ = 0
          , w = h.length - d.length;
        for (e = 0,
        i = h.length; i > e; e++)
          r = h[e],
          r.reused || (this.deleteCachedFrag(r),
          this.remove(r, _++, w, y));
        var x, k, C, T = 0;
        for (e = 0,
        i = d.length; i > e; e++)
          r = d[e],
          x = d[e - 1],
          k = x ? x.staggerCb ? x.staggerAnchor : x.end || x.node : m,
          r.reused && !r.staggerCb ? (C = de(r, m, this.id),
          C === x || C && de(C, m, this.id) === x || this.move(r, k)) : this.insert(r, T++, k, y),
          r.reused = r.fresh = !1
      }
    },
    create: function(t, e, n, i) {
      var r = this._host
        , o = this._scope || this.vm
        , s = Object.create(o);
      s.$refs = Object.create(o.$refs),
      s.$els = Object.create(o.$els),
      s.$parent = o,
      s.$forContext = this,
      kt(s, e, t),
      kt(s, "$index", n),
      i ? kt(s, "$key", i) : s.$key && y(s, "$key", null),
      this.iterator && kt(s, this.iterator, null !== i ? i : n);
      var a = this.factory.create(r, s, this._frag);
      return a.forId = this.id,
      this.cacheFrag(t, a, n, i),
      a
    },
    updateRef: function() {
      var t = this.descriptor.ref;
      if (t) {
        var e, n = (this._scope || this.vm).$refs;
        this.fromObject ? (e = {},
        this.frags.forEach(function(t) {
          e[t.scope.$key] = fe(t)
        })) : e = this.frags.map(fe),
        n[t] = e
      }
    },
    updateModel: function() {
      if (this.isOption) {
        var t = this.start.parentNode
          , e = t && t.__v_model;
        e && e.forceUpdate()
      }
    },
    insert: function(t, e, n, i) {
      t.staggerCb && (t.staggerCb.cancel(),
      t.staggerCb = null);
      var r = this.getStagger(t, e, null, "enter");
      if (i && r) {
        var o = t.staggerAnchor;
        o || (o = t.staggerAnchor = tt("stagger-anchor"),
        o.__vfrag__ = t),
        Y(o, n);
        var s = t.staggerCb = w(function() {
          t.staggerCb = null,
          t.before(o),
          q(o)
        });
        setTimeout(s, r)
      } else
        t.before(n.nextSibling)
    },
    remove: function(t, e, n, i) {
      if (t.staggerCb)
        return t.staggerCb.cancel(),
        void (t.staggerCb = null);
      var r = this.getStagger(t, e, n, "leave");
      if (i && r) {
        var o = t.staggerCb = w(function() {
          t.staggerCb = null,
          t.remove()
        });
        setTimeout(o, r)
      } else
        t.remove()
    },
    move: function(t, e) {
      t.before(e.nextSibling, !1)
    },
    cacheFrag: function(t, e, i, r) {
      var o, s = this.params.trackBy, a = this.cache, l = !g(t);
      r || s || l ? (o = s ? "$index" === s ? i : t[s] : r || t,
      a[o] ? "$index" !== s && this.warnDuplicate(t) : a[o] = e) : (o = this.id,
      n(t, o) ? null === t[o] ? t[o] = e : this.warnDuplicate(t) : y(t, o, e)),
      e.raw = t
    },
    getCachedFrag: function(t, e, n) {
      var i, r = this.params.trackBy, o = !g(t);
      if (n || r || o) {
        var s = r ? "$index" === r ? e : t[r] : n || t;
        i = this.cache[s]
      } else
        i = t[this.id];
      return i && (i.reused || i.fresh) && this.warnDuplicate(t),
      i
    },
    deleteCachedFrag: function(t) {
      var e = t.raw
        , i = this.params.trackBy
        , r = t.scope
        , o = r.$index
        , s = n(r, "$key") && r.$key
        , a = !g(e);
      if (i || s || a) {
        var l = i ? "$index" === i ? o : e[i] : s || e;
        this.cache[l] = null
      } else
        e[this.id] = null,
        t.raw = null
    },
    getStagger: function(t, e, n, i) {
      i += "Stagger";
      var r = t.node.__v_trans
        , o = r && r.hooks
        , s = o && (o[i] || o.stagger);
      return s ? s.call(t, e, n) : e * parseInt(this.params[i] || this.params.stagger, 10)
    },
    _preProcess: function(t) {
      return this.rawValue = t,
      t
    },
    _postProcess: function(t) {
      if (xn(t))
        return t;
      if (v(t)) {
        for (var e, n = Object.keys(t), i = n.length, r = new Array(i); i--; )
          e = n[i],
          r[i] = {
            $key: e,
            $value: t[e]
          };
        return r
      }
      return "number" == typeof t && (t = pe(t)),
      t || []
    },
    unbind: function() {
      if (this.descriptor.ref && ((this._scope || this.vm).$refs[this.descriptor.ref] = null),
      this.frags)
        for (var t, e = this.frags.length; e--; )
          t = this.frags[e],
          this.deleteCachedFrag(t),
          t.destroy()
    }
  };
  Lr.warnDuplicate = function(t) {
    oi('Duplicate value found in v-for="' + this.descriptor.raw + '": ' + JSON.stringify(t) + '. Use track-by="$index" if you are expecting duplicate values.')
  }
  ;
  var Pr = {
    bind: function() {
      8 === this.el.nodeType && (this.nodes = [],
      this.anchor = tt("v-html"),
      B(this.el, this.anchor))
    },
    update: function(t) {
      t = o(t),
      this.nodes ? this.swap(t) : this.el.innerHTML = t
    },
    swap: function(t) {
      for (var e = this.nodes.length; e--; )
        q(this.nodes[e]);
      var n = ne(t, !0, !0);
      this.nodes = p(n.childNodes),
      W(n, this.anchor)
    }
  }
    , Fr = {
    bind: function() {
      this.attr = 3 === this.el.nodeType ? "data" : "textContent"
    },
    update: function(t) {
      this.el[this.attr] = o(t)
    }
  }
    , Ir = {
    text: Fr,
    html: Pr,
    "for": Lr,
    "if": jr,
    show: kr,
    model: xr,
    on: gr,
    bind: pr,
    el: nr,
    ref: er,
    cloak: tr
  }
    , Hr = []
    , Rr = !1
    , Wr = 1
    , Yr = 2
    , qr = Sn + "Duration"
    , Ur = En + "Duration"
    , Br = ve.prototype;
  Br.enter = function(t, e) {
    this.cancelPending(),
    this.callHook("beforeEnter"),
    this.cb = e,
    G(this.el, this.enterClass),
    t(),
    this.entered = !1,
    this.callHookWithCb("enter"),
    this.entered || (this.cancel = this.hooks && this.hooks.enterCancelled,
    me(this.enterNextTick))
  }
  ,
  Br.enterNextTick = function() {
    this.justEntered = !0;
    var t = this;
    setTimeout(function() {
      t.justEntered = !1
    }, 17);
    var e = this.enterDone
      , n = this.getCssTransitionType(this.enterClass);
    this.pendingJsCb ? n === Wr && X(this.el, this.enterClass) : n === Wr ? (X(this.el, this.enterClass),
    this.setupCssCb(Dn, e)) : n === Yr ? this.setupCssCb(On, e) : e()
  }
  ,
  Br.enterDone = function() {
    this.entered = !0,
    this.cancel = this.pendingJsCb = null,
    X(this.el, this.enterClass),
    this.callHook("afterEnter"),
    this.cb && this.cb()
  }
  ,
  Br.leave = function(t, e) {
    this.cancelPending(),
    this.callHook("beforeLeave"),
    this.op = t,
    this.cb = e,
    G(this.el, this.leaveClass),
    this.left = !1,
    this.callHookWithCb("leave"),
    this.left || (this.cancel = this.hooks && this.hooks.leaveCancelled,
    this.op && !this.pendingJsCb && (this.justEntered ? this.leaveDone() : me(this.leaveNextTick)))
  }
  ,
  Br.leaveNextTick = function() {
    var t = this.getCssTransitionType(this.leaveClass);
    if (t) {
      var e = t === Wr ? Dn : On;
      this.setupCssCb(e, this.leaveDone)
    } else
      this.leaveDone()
  }
  ,
  Br.leaveDone = function() {
    this.left = !0,
    this.cancel = this.pendingJsCb = null,
    this.op(),
    X(this.el, this.leaveClass),
    this.callHook("afterLeave"),
    this.cb && this.cb(),
    this.op = null
  }
  ,
  Br.cancelPending = function() {
    this.op = this.cb = null;
    var t = !1;
    this.pendingCssCb && (t = !0,
    z(this.el, this.pendingCssEvent, this.pendingCssCb),
    this.pendingCssEvent = this.pendingCssCb = null),
    this.pendingJsCb && (t = !0,
    this.pendingJsCb.cancel(),
    this.pendingJsCb = null),
    t && (X(this.el, this.enterClass),
    X(this.el, this.leaveClass)),
    this.cancel && (this.cancel.call(this.vm, this.el),
    this.cancel = null)
  }
  ,
  Br.callHook = function(t) {
    this.hooks && this.hooks[t] && this.hooks[t].call(this.vm, this.el)
  }
  ,
  Br.callHookWithCb = function(t) {
    var e = this.hooks && this.hooks[t];
    e && (e.length > 1 && (this.pendingJsCb = w(this[t + "Done"])),
    e.call(this.vm, this.el, this.pendingJsCb))
  }
  ,
  Br.getCssTransitionType = function(t) {
    if (!(!Dn || document.hidden || this.hooks && this.hooks.css === !1 || ye(this.el))) {
      var e = this.typeCache[t];
      if (e)
        return e;
      var n = this.el.style
        , i = window.getComputedStyle(this.el)
        , r = n[qr] || i[qr];
      if (r && "0s" !== r)
        e = Wr;
      else {
        var o = n[Ur] || i[Ur];
        o && "0s" !== o && (e = Yr)
      }
      return e && (this.typeCache[t] = e),
      e
    }
  }
  ,
  Br.setupCssCb = function(t, e) {
    this.pendingCssEvent = t;
    var n = this
      , i = this.el
      , r = this.pendingCssCb = function(o) {
      o.target === i && (z(i, t, r),
      n.pendingCssEvent = n.pendingCssCb = null,
      !n.pendingJsCb && e && e())
    }
    ;
    V(i, t, r)
  }
  ;
  var Vr = {
    priority: 1100,
    update: function(t, e) {
      var n = this.el
        , i = gt(this.vm.$options, "transitions", t);
      t = t || "v",
      n.__v_trans = new ve(n,t,i,this.el.__vue__ || this.vm),
      e && X(n, e + "-transition"),
      G(n, t + "-transition")
    }
  }
    , zr = ri._propBindingModes
    , Gr = {
    bind: function() {
      var t = this.vm
        , e = t._context
        , n = this.descriptor.prop
        , i = n.path
        , r = n.parentPath
        , o = n.mode === zr.TWO_WAY
        , s = this.parentWatcher = new qt(e,r,function(e) {
        at(n, e) && (t[i] = e)
      }
      ,{
        twoWay: o,
        filters: n.filters,
        scope: this._scope
      });
      if (st(t, n, s.value),
      o) {
        var a = this;
        t.$once("hook:created", function() {
          a.childWatcher = new qt(t,i,function(t) {
            s.set(t)
          }
          ,{
            sync: !0
          })
        })
      }
    },
    unbind: function() {
      this.parentWatcher.teardown(),
      this.childWatcher && this.childWatcher.teardown()
    }
  }
    , Xr = {
    priority: 1500,
    params: ["keep-alive", "transition-mode", "inline-template"],
    bind: function() {
      this.el.__vue__ ? oi('cannot mount component "' + this.expression + '" on already mounted element: ' + this.el) : (this.keepAlive = this.params.keepAlive,
      this.keepAlive && (this.cache = {}),
      this.params.inlineTemplate && (this.inlineTemplate = J(this.el, !0)),
      this.pendingComponentCb = this.Component = null,
      this.pendingRemovals = 0,
      this.pendingRemovalCb = null,
      this.anchor = tt("v-component"),
      B(this.el, this.anchor),
      this.el.removeAttribute("is"),
      this.descriptor.ref && this.el.removeAttribute("v-ref:" + h(this.descriptor.ref)),
      this.literal && this.setComponent(this.expression))
    },
    update: function(t) {
      this.literal || this.setComponent(t)
    },
    setComponent: function(t, e) {
      if (this.invalidatePending(),
      t) {
        var n = this;
        this.resolveComponent(t, function() {
          n.mountComponent(e)
        })
      } else
        this.unbuild(!0),
        this.remove(this.childVM, e),
        this.childVM = null
    },
    resolveComponent: function(t, e) {
      var n = this;
      this.pendingComponentCb = w(function(i) {
        n.ComponentName = i.options.name || t,
        n.Component = i,
        e()
      }),
      this.vm._resolveComponent(t, this.pendingComponentCb)
    },
    mountComponent: function(t) {
      this.unbuild(!0);
      var e = this
        , n = this.Component.options.activate
        , i = this.getCached()
        , r = this.build();
      n && !i ? (this.waitingFor = r,
      n.call(r, function() {
        e.waitingFor = null,
        e.transition(r, t)
      })) : (i && r._updateRef(),
      this.transition(r, t))
    },
    invalidatePending: function() {
      this.pendingComponentCb && (this.pendingComponentCb.cancel(),
      this.pendingComponentCb = null)
    },
    build: function(t) {
      var e = this.getCached();
      if (e)
        return e;
      if (this.Component) {
        var n = {
          name: this.ComponentName,
          el: ee(this.el),
          template: this.inlineTemplate,
          parent: this._host || this.vm,
          _linkerCachable: !this.inlineTemplate,
          _ref: this.descriptor.ref,
          _asComponent: !0,
          _isRouterView: this._isRouterView,
          _context: this.vm,
          _scope: this._scope,
          _frag: this._frag
        };
        t && m(n, t);
        var i = new this.Component(n);
        return this.keepAlive && (this.cache[this.Component.cid] = i),
        this.el.hasAttribute("transition") && i._isFragment && oi("Transitions will not work on a fragment instance. Template: " + i.$options.template),
        i
      }
    },
    getCached: function() {
      return this.keepAlive && this.cache[this.Component.cid]
    },
    unbuild: function(t) {
      this.waitingFor && (this.waitingFor.$destroy(),
      this.waitingFor = null);
      var e = this.childVM;
      return !e || this.keepAlive ? void (e && e._updateRef(!0)) : void e.$destroy(!1, t)
    },
    remove: function(t, e) {
      var n = this.keepAlive;
      if (t) {
        this.pendingRemovals++,
        this.pendingRemovalCb = e;
        var i = this;
        t.$remove(function() {
          i.pendingRemovals--,
          n || t._cleanup(),
          !i.pendingRemovals && i.pendingRemovalCb && (i.pendingRemovalCb(),
          i.pendingRemovalCb = null)
        })
      } else
        e && e()
    },
    transition: function(t, e) {
      var n = this
        , i = this.childVM;
      switch (i && (i._inactive = !0),
      t._inactive = !1,
      this.childVM = t,
      n.params.transitionMode) {
      case "in-out":
        t.$before(n.anchor, function() {
          n.remove(i, e)
        });
        break;
      case "out-in":
        n.remove(i, function() {
          t.$before(n.anchor, e)
        });
        break;
      default:
        n.remove(i),
        t.$before(n.anchor, e)
      }
    },
    unbind: function() {
      if (this.invalidatePending(),
      this.unbuild(),
      this.cache) {
        for (var t in this.cache)
          this.cache[t].$destroy();
        this.cache = null
      }
    }
  }
    , Jr = {
    deep: !0,
    update: function(t) {
      t && "string" == typeof t ? this.handleObject(be(t)) : v(t) ? this.handleObject(t) : xn(t) ? this.handleArray(t) : this.cleanup()
    },
    handleObject: function(t) {
      this.cleanup(t);
      for (var e = this.prevKeys = Object.keys(t), n = 0, i = e.length; i > n; n++) {
        var r = e[n];
        t[r] ? G(this.el, r) : X(this.el, r)
      }
    },
    handleArray: function(t) {
      this.cleanup(t);
      for (var e = 0, n = t.length; n > e; e++)
        t[e] && G(this.el, t[e]);
      this.prevKeys = t.slice()
    },
    cleanup: function(t) {
      if (this.prevKeys)
        for (var e = this.prevKeys.length; e--; ) {
          var n = this.prevKeys[e];
          !n || t && _e(t, n) || X(this.el, n)
        }
    }
  }
    , Qr = {
    style: lr,
    "class": Jr,
    component: Xr,
    prop: Gr,
    transition: Vr
  }
    , Zr = ri._propBindingModes
    , Kr = {}
    , to = /^[$_a-zA-Z]+[\w$]*$/
    , eo = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\[[^\[\]]+\])*$/
    , no = /^v-bind:|^:/
    , io = /^v-on:|^@/
    , ro = /:(.*)$/
    , oo = /\.[^\.]+/g
    , so = /^(v-bind:|:)?transition$/
    , ao = ["for", "if"]
    , lo = 1e3;
  Ye.terminal = !0;
  var uo = /[^\w\-:\.]/
    , co = Object.freeze({
    compile: Ce,
    compileAndLinkProps: Ee,
    compileRoot: Oe,
    transclude: ze
  })
    , ho = /^v-on:|^@/;
  tn.prototype._bind = function() {
    var t = this.name
      , e = this.descriptor;
    if (("cloak" !== t || this.vm._isCompiled) && this.el && this.el.removeAttribute) {
      var n = e.attr || "v-" + t;
      this.el.removeAttribute(n)
    }
    var i = e.def;
    if ("function" == typeof i ? this.update = i : m(this, i),
    this._setupParams(),
    this.bind && this.bind(),
    this.literal)
      this.update && this.update(e.raw);
    else if ((this.expression || this.modifiers) && (this.update || this.twoWay) && !this._checkStatement()) {
      var r = this;
      this.update ? this._update = function(t, e) {
        r._locked || r.update(t, e)
      }
      : this._update = Ke;
      var o = this._preProcess ? f(this._preProcess, this) : null
        , s = this._postProcess ? f(this._postProcess, this) : null
        , a = this._watcher = new qt(this.vm,this.expression,this._update,{
        filters: this.filters,
        twoWay: this.twoWay,
        deep: this.deep,
        preProcess: o,
        postProcess: s,
        scope: this._scope
      });
      this.afterBind ? this.afterBind() : this.update && this.update(a.value)
    }
    this._bound = !0
  }
  ,
  tn.prototype._setupParams = function() {
    if (this.params) {
      var t = this.params;
      this.params = Object.create(null);
      for (var e, n, i, r = t.length; r--; )
        e = t[r],
        i = u(e),
        n = R(this.el, e),
        null != n ? this._setupParamWatcher(i, n) : (n = H(this.el, e),
        null != n && (this.params[i] = "" === n ? !0 : n))
    }
  }
  ,
  tn.prototype._setupParamWatcher = function(t, e) {
    var n = this
      , i = !1
      , r = (this._scope || this.vm).$watch(e, function(e, r) {
      if (n.params[t] = e,
      i) {
        var o = n.paramWatchers && n.paramWatchers[t];
        o && o.call(n, e, r)
      } else
        i = !0
    }, {
      immediate: !0
    });
    (this._paramUnwatchFns || (this._paramUnwatchFns = [])).push(r)
  }
  ,
  tn.prototype._checkStatement = function() {
    var t = this.expression;
    if (t && this.acceptStatement && !It(t)) {
      var e = Ft(t).get
        , n = this._scope || this.vm
        , i = function(t) {
        n.$event = t,
        e.call(n, n),
        n.$event = null
      };
      return this.filters && (i = n._applyFilters(i, null, this.filters)),
      this.update(i),
      !0
    }
  }
  ,
  tn.prototype.set = function(t) {
    this.twoWay ? this._withLock(function() {
      this._watcher.set(t)
    }) : oi("Directive.set() can only be used inside twoWaydirectives.")
  }
  ,
  tn.prototype._withLock = function(t) {
    var e = this;
    e._locked = !0,
    t.call(e),
    jn(function() {
      e._locked = !1
    })
  }
  ,
  tn.prototype.on = function(t, e) {
    V(this.el, t, e),
    (this._listeners || (this._listeners = [])).push([t, e])
  }
  ,
  tn.prototype._teardown = function() {
    if (this._bound) {
      this._bound = !1,
      this.unbind && this.unbind(),
      this._watcher && this._watcher.teardown();
      var t, e = this._listeners;
      if (e)
        for (t = e.length; t--; )
          z(this.el, e[t][0], e[t][1]);
      var n = this._paramUnwatchFns;
      if (n)
        for (t = n.length; t--; )
          n[t]();
      this.el && this.el._vue_directives.$remove(this),
      this.vm = this.el = this._watcher = this._listeners = null
    }
  }
  ;
  var fo = /[^|]\|[^|]/;
  Ct(un),
  Qe(un),
  Ze(un),
  en(un),
  nn(un),
  rn(un),
  on(un),
  sn(un),
  an(un),
  ln(un);
  var po = Lr._postProcess
    , mo = /(\d{3})(?=\d)/g
    , go = {
    orderBy: dn,
    filterBy: hn,
    limitBy: cn,
    json: {
      read: function(t, e) {
        return "string" == typeof t ? t : JSON.stringify(t, null, Number(e) || 2)
      },
      write: function(t) {
        try {
          return JSON.parse(t)
        } catch (e) {
          return t
        }
      }
    },
    capitalize: function(t) {
      return t || 0 === t ? (t = t.toString(),
      t.charAt(0).toUpperCase() + t.slice(1)) : ""
    },
    uppercase: function(t) {
      return t || 0 === t ? t.toString().toUpperCase() : ""
    },
    lowercase: function(t) {
      return t || 0 === t ? t.toString().toLowerCase() : ""
    },
    currency: function(t, e) {
      if (t = parseFloat(t),
      !isFinite(t) || !t && 0 !== t)
        return "";
      e = null != e ? e : "$";
      var n = Math.abs(t).toFixed(2)
        , i = n.slice(0, -3)
        , r = i.length % 3
        , o = r > 0 ? i.slice(0, r) + (i.length > 3 ? "," : "") : ""
        , s = n.slice(-3)
        , a = 0 > t ? "-" : "";
      return e + a + o + i.slice(r).replace(mo, "$1,") + s
    },
    pluralize: function(t) {
      var e = p(arguments, 1);
      return e.length > 1 ? e[t % 10 - 1] || e[e.length - 1] : e[0] + (1 === t ? "" : "s")
    },
    debounce: function(t, e) {
      return t ? (e || (e = 300),
      b(t, e)) : void 0
    }
  }
    , vo = {
    priority: 1750,
    params: ["name"],
    paramWatchers: {
      name: function(t) {
        jr.remove.call(this),
        t && this.insert(t)
      }
    },
    bind: function() {
      this.anchor = tt("v-partial"),
      B(this.el, this.anchor),
      this.insert(this.params.name)
    },
    insert: function(t) {
      var e = gt(this.vm.$options, "partials", t);
      vt(e, "partial", t),
      e && (this.factory = new he(this.vm,e),
      jr.insert.call(this))
    },
    unbind: function() {
      this.frag && this.frag.destroy()
    }
  }
    , yo = {
    priority: 1750,
    params: ["name"],
    bind: function() {
      var t, e = this.vm, n = e.$options._content;
      if (!n)
        return void this.fallback();
      var i = e._context
        , r = this.params.name;
      if (r) {
        var o = '[slot="' + r + '"]'
          , s = n.querySelectorAll(o);
        s.length ? (t = pn(s, n),
        t.hasChildNodes() ? this.compile(t, i, e) : this.fallback()) : this.fallback()
      } else {
        var a = this
          , l = function() {
          a.compile(pn(n.childNodes, n, !0), i, e)
        };
        e._isCompiled ? l() : e.$once("hook:compiled", l)
      }
    },
    fallback: function() {
      this.compile(J(this.el, !0), this.vm)
    },
    compile: function(t, e, n) {
      if (t && e) {
        var i = n ? n._scope : this._scope;
        this.unlink = e.$compile(t, n, i, this._frag)
      }
      t ? B(this.el, t) : q(this.el)
    },
    unbind: function() {
      this.unlink && this.unlink()
    }
  }
    , bo = {
    slot: yo,
    partial: vo
  };
  return un.version = "1.0.10",
  un.options = {
    directives: Ir,
    elementDirectives: bo,
    filters: go,
    transitions: {},
    components: {},
    partials: {},
    replace: !0
  },
  Cn && window.__VUE_DEVTOOLS_GLOBAL_HOOK__ && window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit("init", un),
  un
}),
function(t, e) {
  "object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == typeof exports ? exports.VueResource = e() : t.VueResource = e()
}(this, function() {
  return function(t) {
    function e(i) {
      if (n[i])
        return n[i].exports;
      var r = n[i] = {
        exports: {},
        id: i,
        loaded: !1
      };
      return t[i].call(r.exports, r, r.exports, e),
      r.loaded = !0,
      r.exports
    }
    var n = {};
    return e.m = t,
    e.c = n,
    e.p = "",
    e(0)
  }([function(t, e, n) {
    function i(t) {
      var e = n(1)(t);
      t.url = n(2)(e),
      t.http = n(3)(e),
      t.resource = n(7)(e),
      Object.defineProperties(t.prototype, {
        $url: {
          get: function() {
            return e.options(t.url, this, this.$options.url)
          }
        },
        $http: {
          get: function() {
            return e.options(t.http, this, this.$options.http)
          }
        },
        $resource: {
          get: function() {
            return t.resource.bind(this)
          }
        }
      })
    }
    window.Vue && Vue.use(i),
    t.exports = i
  }
  , function(t, e) {
    t.exports = function(t) {
      function e(t, i, r) {
        for (var o in i)
          r && (n.isPlainObject(i[o]) || n.isArray(i[o])) ? (n.isPlainObject(i[o]) && !n.isPlainObject(t[o]) && (t[o] = {}),
          n.isArray(i[o]) && !n.isArray(t[o]) && (t[o] = []),
          e(t[o], i[o], r)) : void 0 !== i[o] && (t[o] = i[o])
      }
      var n = t.util.extend({}, t.util);
      return n.isString = function(t) {
        return "string" == typeof t
      }
      ,
      n.isFunction = function(t) {
        return "function" == typeof t
      }
      ,
      n.options = function(t, e, i) {
        return i = i || {},
        n.isFunction(i) && (i = i.call(e)),
        n.extend(t.bind({
          vm: e,
          options: i
        }), t, {
          options: i
        })
      }
      ,
      n.each = function(t, e) {
        var i, r;
        if ("number" == typeof t.length)
          for (i = 0; i < t.length; i++)
            e.call(t[i], t[i], i);
        else if (n.isObject(t))
          for (r in t)
            t.hasOwnProperty(r) && e.call(t[r], t[r], r);
        return t
      }
      ,
      n.extend = function(t) {
        var n, i = [], r = i.slice.call(arguments, 1);
        return "boolean" == typeof t && (n = t,
        t = r.shift()),
        r.forEach(function(i) {
          e(t, i, n)
        }),
        t
      }
      ,
      n
    }
  }
  , function(t, e) {
    var n = document.documentMode
      , i = document.createElement("a");
    t.exports = function(t) {
      function e(n, i) {
        var r, s = {}, a = {}, l = n;
        return t.isPlainObject(l) || (l = {
          url: n,
          params: i
        }),
        l = t.extend(!0, {}, e.options, this.options, l),
        n = l.url.replace(/(\/?):([a-z]\w*)/gi, function(t, e, n) {
          return l.params[n] ? (s[n] = !0,
          e + o(l.params[n])) : ""
        }),
        t.isString(l.root) && !n.match(/^(https?:)?\//) && (n = l.root + "/" + n),
        t.each(l.params, function(t, e) {
          s[e] || (a[e] = t)
        }),
        r = e.params(a),
        r && (n += (-1 == n.indexOf("?") ? "?" : "&") + r),
        n
      }
      function r(e, n, i) {
        var o, s = t.isArray(n), a = t.isPlainObject(n);
        t.each(n, function(n, l) {
          o = t.isObject(n) || t.isArray(n),
          i && (l = i + "[" + (a || o ? l : "") + "]"),
          !i && s ? e.add(n.name, n.value) : o ? r(e, n, l) : e.add(l, n)
        })
      }
      function o(t) {
        return s(t, !0).replace(/%26/gi, "&").replace(/%3D/gi, "=").replace(/%2B/gi, "+")
      }
      function s(t, e) {
        return encodeURIComponent(t).replace(/%40/gi, "@").replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, e ? "%20" : "+")
      }
      return e.options = {
        url: "",
        root: null,
        params: {}
      },
      e.params = function(e) {
        var n = [];
        return n.add = function(e, n) {
          t.isFunction(n) && (n = n()),
          null === n && (n = ""),
          this.push(o(e) + "=" + o(n))
        }
        ,
        r(n, e),
        n.join("&")
      }
      ,
      e.parse = function(t) {
        return n && (i.href = t,
        t = i.href),
        i.href = t,
        {
          href: i.href,
          protocol: i.protocol ? i.protocol.replace(/:$/, "") : "",
          port: i.port,
          host: i.host,
          hostname: i.hostname,
          pathname: "/" === i.pathname.charAt(0) ? i.pathname : "/" + i.pathname,
          search: i.search ? i.search.replace(/^\?/, "") : "",
          hash: i.hash ? i.hash.replace(/^#/, "") : ""
        }
      }
      ,
      t.url = e
    }
  }
  , function(t, e, n) {
    var i = n(4)
      , r = n(6)
      , o = n(5);
    t.exports = function(t) {
      function e(o, l) {
        var u;
        return t.isPlainObject(o) && (l = o,
        o = ""),
        l = t.extend({
          url: o
        }, l),
        l = t.extend(!0, {}, e.options, this.options, l),
        null === l.crossOrigin && (l.crossOrigin = a(l.url)),
        l.method = l.method.toUpperCase(),
        l.headers = t.extend({}, e.headers.common, l.crossOrigin ? {} : e.headers.custom, e.headers[l.method.toLowerCase()], l.headers),
        t.isPlainObject(l.data) && /^(GET|JSONP)$/i.test(l.method) && (t.extend(l.params, l.data),
        delete l.data),
        l.emulateHTTP && !l.crossOrigin && /^(PUT|PATCH|DELETE)$/i.test(l.method) && (l.headers["X-HTTP-Method-Override"] = l.method,
        l.method = "POST"),
        l.emulateJSON && t.isPlainObject(l.data) && (l.headers["Content-Type"] = "application/x-www-form-urlencoded",
        l.data = t.url.params(l.data)),
        t.isObject(l.data) && /FormData/i.test(l.data.toString()) && delete l.headers["Content-Type"],
        t.isPlainObject(l.data) && (l.data = JSON.stringify(l.data)),
        u = ("JSONP" == l.method ? r : i).call(this.vm, t, l),
        u = n(u.then(s, s), this.vm),
        l.success && (u = u.success(l.success)),
        l.error && (u = u.error(l.error)),
        u
      }
      function n(t, e) {
        return t.success = function(i) {
          return n(t.then(function(t) {
            return i.call(e, t.data, t.status, t) || t
          }), e)
        }
        ,
        t.error = function(i) {
          return n(t.then(void 0, function(t) {
            return i.call(e, t.data, t.status, t) || t
          }), e)
        }
        ,
        t.always = function(i) {
          var r = function(t) {
            return i.call(e, t.data, t.status, t) || t
          };
          return n(t.then(r, r), e)
        }
        ,
        t
      }
      function s(t) {
        try {
          t.data = JSON.parse(t.responseText)
        } catch (e) {
          t.data = t.responseText
        }
        return t.ok ? t : o.reject(t)
      }
      function a(e) {
        var n = t.url.parse(e);
        return n.protocol !== l.protocol || n.host !== l.host
      }
      var l = t.url.parse(location.href)
        , u = {
        "Content-Type": "application/json;charset=utf-8"
      };
      return e.options = {
        method: "get",
        params: {},
        data: "",
        xhr: null,
        jsonp: "callback",
        beforeSend: null,
        crossOrigin: null,
        emulateHTTP: !1,
        emulateJSON: !1
      },
      e.headers = {
        put: u,
        post: u,
        patch: u,
        "delete": u,
        common: {
          Accept: "application/json, text/plain, */*"
        },
        custom: {
          "X-Requested-With": "XMLHttpRequest"
        }
      },
      ["get", "put", "post", "patch", "delete", "jsonp"].forEach(function(n) {
        e[n] = function(e, i, r, o) {
          return t.isFunction(i) && (o = r,
          r = i,
          i = void 0),
          this(e, t.extend({
            method: n,
            data: i,
            success: r
          }, o))
        }
      }),
      t.http = e
    }
  }
  , function(t, e, n) {
    var i = n(5)
      , r = window.XDomainRequest;
    t.exports = function(t, e) {
      var n, o = new XMLHttpRequest;
      return r && e.crossOrigin && (o = new XDomainRequest,
      e.headers = {}),
      t.isPlainObject(e.xhr) && t.extend(o, e.xhr),
      t.isFunction(e.beforeSend) && e.beforeSend.call(this, o, e),
      n = new i(function(n, i) {
        o.open(e.method, t.url(e), !0),
        t.each(e.headers, function(t, e) {
          o.setRequestHeader(e, t)
        });
        var r = function(t) {
          o.ok = "load" === t.type,
          o.ok && o.status && (o.ok = o.status >= 200 && o.status < 300),
          (o.ok ? n : i)(o)
        };
        o.onload = r,
        o.onabort = r,
        o.onerror = r,
        o.send(e.data)
      }
      )
    }
  }
  , function(t, e) {
    function n(t) {
      this.state = o,
      this.value = void 0,
      this.deferred = [];
      var e = this;
      try {
        t(function(t) {
          e.resolve(t)
        }, function(t) {
          e.reject(t)
        })
      } catch (n) {
        e.reject(n)
      }
    }
    var i = 0
      , r = 1
      , o = 2;
    n.reject = function(t) {
      return new n(function(e, n) {
        n(t)
      }
      )
    }
    ,
    n.resolve = function(t) {
      return new n(function(e, n) {
        e(t)
      }
      )
    }
    ,
    n.all = function(t) {
      return new n(function(e, n) {
        function i(n) {
          return function(i) {
            o[n] = i,
            r += 1,
            r === t.length && e(o)
          }
        }
        var r = 0
          , o = [];
        0 === t.length && e(o);
        for (var s = 0; s < t.length; s += 1)
          t[s].then(i(s), n)
      }
      )
    }
    ,
    n.race = function(t) {
      return new n(function(e, n) {
        for (var i = 0; i < t.length; i += 1)
          t[i].then(e, n)
      }
      )
    }
    ;
    var s = n.prototype;
    s.resolve = function(t) {
      var e = this;
      if (e.state === o) {
        if (t === e)
          throw new TypeError("Promise settled with itself.");
        var n = !1;
        try {
          var r = t && t.then;
          if (null !== t && "object" == typeof t && "function" == typeof r)
            return void r.call(t, function(t) {
              n || e.resolve(t),
              n = !0
            }, function(t) {
              n || e.reject(t),
              n = !0
            })
        } catch (s) {
          return void (n || e.reject(s))
        }
        e.state = i,
        e.value = t,
        e.notify()
      }
    }
    ,
    s.reject = function(t) {
      var e = this;
      if (e.state === o) {
        if (t === e)
          throw new TypeError("Promise settled with itself.");
        e.state = r,
        e.value = t,
        e.notify()
      }
    }
    ,
    s.notify = function() {
      var t = this;
      l(function() {
        if (t.state !== o)
          for (; t.deferred.length; ) {
            var e = t.deferred.shift()
              , n = e[0]
              , s = e[1]
              , a = e[2]
              , l = e[3];
            try {
              t.state === i ? a("function" == typeof n ? n.call(void 0, t.value) : t.value) : t.state === r && ("function" == typeof s ? a(s.call(void 0, t.value)) : l(t.value))
            } catch (u) {
              l(u)
            }
          }
      })
    }
    ,
    s["catch"] = function(t) {
      return this.then(void 0, t)
    }
    ,
    s.then = function(t, e) {
      var i = this;
      return new n(function(n, r) {
        i.deferred.push([t, e, n, r]),
        i.notify()
      }
      )
    }
    ;
    var a = []
      , l = function(t) {
      a.push(t),
      1 === a.length && l.async()
    };
    if (l.run = function() {
      for (; a.length; )
        a[0](),
        a.shift()
    }
    ,
    window.MutationObserver) {
      var u = document.createElement("div")
        , c = new MutationObserver(l.run);
      c.observe(u, {
        attributes: !0
      }),
      l.async = function() {
        u.setAttribute("x", 0)
      }
    } else
      l.async = function() {
        setTimeout(l.run)
      }
      ;
    t.exports = window.Promise || n
  }
  , function(t, e, n) {
    var i = n(5);
    t.exports = function(t, e) {
      var n, r, o = "_jsonp" + Math.random().toString(36).substr(2), s = {};
      return e.params[e.jsonp] = o,
      t.isFunction(e.beforeSend) && e.beforeSend.call(this, {}, e),
      new i(function(i, a) {
        n = document.createElement("script"),
        n.src = t.url(e),
        n.type = "text/javascript",
        n.async = !0,
        window[o] = function(t) {
          r = t
        }
        ;
        var l = function(t) {
          delete window[o],
          document.body.removeChild(n),
          "load" !== t.type || r || (t.type = "error"),
          s.ok = "error" !== t.type,
          s.status = s.ok ? 200 : 404,
          s.responseText = r ? r : t.type,
          (s.ok ? i : a)(s)
        };
        n.onload = l,
        n.onerror = l,
        document.body.appendChild(n)
      }
      )
    }
  }
  , function(t, e) {
    t.exports = function(t) {
      function e(i, r, o, s) {
        var a = this
          , l = {};
        return o = t.extend({}, e.actions, o),
        t.each(o, function(e, o) {
          e = t.extend(!0, {
            url: i,
            params: r || {}
          }, s, e),
          l[o] = function() {
            return (a.$http || t.http)(n(e, arguments))
          }
        }),
        l
      }
      function n(e, n) {
        var i, r, o, s = t.extend({}, e), a = {};
        switch (n.length) {
        case 4:
          o = n[3],
          r = n[2];
        case 3:
        case 2:
          if (!t.isFunction(n[1])) {
            a = n[0],
            i = n[1],
            r = n[2];
            break
          }
          if (t.isFunction(n[0])) {
            r = n[0],
            o = n[1];
            break
          }
          r = n[1],
          o = n[2];
        case 1:
          t.isFunction(n[0]) ? r = n[0] : /^(POST|PUT|PATCH)$/i.test(s.method) ? i = n[0] : a = n[0];
          break;
        case 0:
          break;
        default:
          throw "Expected up to 4 arguments [params, data, success, error], got " + n.length + " arguments"
        }
        return s.data = i,
        s.params = t.extend({}, s.params, a),
        r && (s.success = r),
        o && (s.error = o),
        s
      }
      return e.actions = {
        get: {
          method: "GET"
        },
        save: {
          method: "POST"
        },
        query: {
          method: "GET"
        },
        update: {
          method: "PUT"
        },
        remove: {
          method: "DELETE"
        },
        "delete": {
          method: "DELETE"
        }
      },
      t.resource = e
    }
  }
  ])
}),
function(t, e) {
  "object" == typeof exports && "undefined" != typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define(e) : t.moment = e()
}(this, function() {
  "use strict";
  function t() {
    return Mn.apply(null, arguments)
  }
  function e(t) {
    Mn = t
  }
  function n(t) {
    return "[object Array]" === Object.prototype.toString.call(t)
  }
  function i(t) {
    return t instanceof Date || "[object Date]" === Object.prototype.toString.call(t)
  }
  function r(t, e) {
    var n, i = [];
    for (n = 0; n < t.length; ++n)
      i.push(e(t[n], n));
    return i
  }
  function o(t, e) {
    return Object.prototype.hasOwnProperty.call(t, e)
  }
  function s(t, e) {
    for (var n in e)
      o(e, n) && (t[n] = e[n]);
    return o(e, "toString") && (t.toString = e.toString),
    o(e, "valueOf") && (t.valueOf = e.valueOf),
    t
  }
  function a(t, e, n, i) {
    return Dt(t, e, n, i, !0).utc()
  }
  function l() {
    return {
      empty: !1,
      unusedTokens: [],
      unusedInput: [],
      overflow: -2,
      charsLeftOver: 0,
      nullInput: !1,
      invalidMonth: null,
      invalidFormat: !1,
      userInvalidated: !1,
      iso: !1
    }
  }
  function u(t) {
    return null == t._pf && (t._pf = l()),
    t._pf
  }
  function c(t) {
    if (null == t._isValid) {
      var e = u(t);
      t._isValid = !(isNaN(t._d.getTime()) || !(e.overflow < 0) || e.empty || e.invalidMonth || e.invalidWeekday || e.nullInput || e.invalidFormat || e.userInvalidated),
      t._strict && (t._isValid = t._isValid && 0 === e.charsLeftOver && 0 === e.unusedTokens.length && void 0 === e.bigHour)
    }
    return t._isValid
  }
  function h(t) {
    var e = a(NaN);
    return null != t ? s(u(e), t) : u(e).userInvalidated = !0,
    e
  }
  function d(t, e) {
    var n, i, r;
    if ("undefined" != typeof e._isAMomentObject && (t._isAMomentObject = e._isAMomentObject),
    "undefined" != typeof e._i && (t._i = e._i),
    "undefined" != typeof e._f && (t._f = e._f),
    "undefined" != typeof e._l && (t._l = e._l),
    "undefined" != typeof e._strict && (t._strict = e._strict),
    "undefined" != typeof e._tzm && (t._tzm = e._tzm),
    "undefined" != typeof e._isUTC && (t._isUTC = e._isUTC),
    "undefined" != typeof e._offset && (t._offset = e._offset),
    "undefined" != typeof e._pf && (t._pf = u(e)),
    "undefined" != typeof e._locale && (t._locale = e._locale),
    Pn.length > 0)
      for (n in Pn)
        i = Pn[n],
        r = e[i],
        "undefined" != typeof r && (t[i] = r);
    return t
  }
  function f(e) {
    d(this, e),
    this._d = new Date(null != e._d ? e._d.getTime() : NaN),
    Fn === !1 && (Fn = !0,
    t.updateOffset(this),
    Fn = !1)
  }
  function p(t) {
    return t instanceof f || null != t && null != t._isAMomentObject
  }
  function m(t) {
    return 0 > t ? Math.ceil(t) : Math.floor(t)
  }
  function g(t) {
    var e = +t
      , n = 0;
    return 0 !== e && isFinite(e) && (n = m(e)),
    n
  }
  function v(t, e, n) {
    var i, r = Math.min(t.length, e.length), o = Math.abs(t.length - e.length), s = 0;
    for (i = 0; r > i; i++)
      (n && t[i] !== e[i] || !n && g(t[i]) !== g(e[i])) && s++;
    return s + o
  }
  function y() {}
  function b(t) {
    return t ? t.toLowerCase().replace("_", "-") : t
  }
  function _(t) {
    for (var e, n, i, r, o = 0; o < t.length; ) {
      for (r = b(t[o]).split("-"),
      e = r.length,
      n = b(t[o + 1]),
      n = n ? n.split("-") : null; e > 0; ) {
        if (i = w(r.slice(0, e).join("-")))
          return i;
        if (n && n.length >= e && v(r, n, !0) >= e - 1)
          break;
        e--
      }
      o++
    }
    return null
  }
  function w(t) {
    var e = null;
    if (!In[t] && "undefined" != typeof module && module && module.exports)
      try {
        e = Ln._abbr,
        require("./locale/" + t),
        x(e)
      } catch (n) {}
    return In[t]
  }
  function x(t, e) {
    var n;
    return t && (n = "undefined" == typeof e ? C(t) : k(t, e),
    n && (Ln = n)),
    Ln._abbr
  }
  function k(t, e) {
    return null !== e ? (e.abbr = t,
    In[t] = In[t] || new y,
    In[t].set(e),
    x(t),
    In[t]) : (delete In[t],
    null)
  }
  function C(t) {
    var e;
    if (t && t._locale && t._locale._abbr && (t = t._locale._abbr),
    !t)
      return Ln;
    if (!n(t)) {
      if (e = w(t))
        return e;
      t = [t]
    }
    return _(t)
  }
  function T(t, e) {
    var n = t.toLowerCase();
    Hn[n] = Hn[n + "s"] = Hn[e] = t
  }
  function $(t) {
    return "string" == typeof t ? Hn[t] || Hn[t.toLowerCase()] : void 0
  }
  function S(t) {
    var e, n, i = {};
    for (n in t)
      o(t, n) && (e = $(n),
      e && (i[e] = t[n]));
    return i
  }
  function D(e, n) {
    return function(i) {
      return null != i ? (O(this, e, i),
      t.updateOffset(this, n),
      this) : E(this, e)
    }
  }
  function E(t, e) {
    return t._d["get" + (t._isUTC ? "UTC" : "") + e]()
  }
  function O(t, e, n) {
    return t._d["set" + (t._isUTC ? "UTC" : "") + e](n)
  }
  function A(t, e) {
    var n;
    if ("object" == typeof t)
      for (n in t)
        this.set(n, t[n]);
    else if (t = $(t),
    "function" == typeof this[t])
      return this[t](e);
    return this
  }
  function N(t, e, n) {
    var i = "" + Math.abs(t)
      , r = e - i.length
      , o = t >= 0;
    return (o ? n ? "+" : "" : "-") + Math.pow(10, Math.max(0, r)).toString().substr(1) + i
  }
  function j(t, e, n, i) {
    var r = i;
    "string" == typeof i && (r = function() {
      return this[i]()
    }
    ),
    t && (qn[t] = r),
    e && (qn[e[0]] = function() {
      return N(r.apply(this, arguments), e[1], e[2])
    }
    ),
    n && (qn[n] = function() {
      return this.localeData().ordinal(r.apply(this, arguments), t)
    }
    )
  }
  function M(t) {
    return t.match(/\[[\s\S]/) ? t.replace(/^\[|\]$/g, "") : t.replace(/\\/g, "")
  }
  function L(t) {
    var e, n, i = t.match(Rn);
    for (e = 0,
    n = i.length; n > e; e++)
      qn[i[e]] ? i[e] = qn[i[e]] : i[e] = M(i[e]);
    return function(r) {
      var o = "";
      for (e = 0; n > e; e++)
        o += i[e]instanceof Function ? i[e].call(r, t) : i[e];
      return o
    }
  }
  function P(t, e) {
    return t.isValid() ? (e = F(e, t.localeData()),
    Yn[e] = Yn[e] || L(e),
    Yn[e](t)) : t.localeData().invalidDate()
  }
  function F(t, e) {
    function n(t) {
      return e.longDateFormat(t) || t
    }
    var i = 5;
    for (Wn.lastIndex = 0; i >= 0 && Wn.test(t); )
      t = t.replace(Wn, n),
      Wn.lastIndex = 0,
      i -= 1;
    return t
  }
  function I(t) {
    return "function" == typeof t && "[object Function]" === Object.prototype.toString.call(t)
  }
  function H(t, e, n) {
    ri[t] = I(e) ? e : function(t) {
      return t && n ? n : e
    }
  }
  function R(t, e) {
    return o(ri, t) ? ri[t](e._strict, e._locale) : new RegExp(W(t))
  }
  function W(t) {
    return t.replace("\\", "").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function(t, e, n, i, r) {
      return e || n || i || r
    }).replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
  }
  function Y(t, e) {
    var n, i = e;
    for ("string" == typeof t && (t = [t]),
    "number" == typeof e && (i = function(t, n) {
      n[e] = g(t)
    }
    ),
    n = 0; n < t.length; n++)
      oi[t[n]] = i
  }
  function q(t, e) {
    Y(t, function(t, n, i, r) {
      i._w = i._w || {},
      e(t, i._w, i, r)
    })
  }
  function U(t, e, n) {
    null != e && o(oi, t) && oi[t](e, n._a, n, t)
  }
  function B(t, e) {
    return new Date(Date.UTC(t, e + 1, 0)).getUTCDate()
  }
  function V(t) {
    return this._months[t.month()]
  }
  function z(t) {
    return this._monthsShort[t.month()]
  }
  function G(t, e, n) {
    var i, r, o;
    for (this._monthsParse || (this._monthsParse = [],
    this._longMonthsParse = [],
    this._shortMonthsParse = []),
    i = 0; 12 > i; i++) {
      if (r = a([2e3, i]),
      n && !this._longMonthsParse[i] && (this._longMonthsParse[i] = new RegExp("^" + this.months(r, "").replace(".", "") + "$","i"),
      this._shortMonthsParse[i] = new RegExp("^" + this.monthsShort(r, "").replace(".", "") + "$","i")),
      n || this._monthsParse[i] || (o = "^" + this.months(r, "") + "|^" + this.monthsShort(r, ""),
      this._monthsParse[i] = new RegExp(o.replace(".", ""),"i")),
      n && "MMMM" === e && this._longMonthsParse[i].test(t))
        return i;
      if (n && "MMM" === e && this._shortMonthsParse[i].test(t))
        return i;
      if (!n && this._monthsParse[i].test(t))
        return i
    }
  }
  function X(t, e) {
    var n;
    return "string" == typeof e && (e = t.localeData().monthsParse(e),
    "number" != typeof e) ? t : (n = Math.min(t.date(), B(t.year(), e)),
    t._d["set" + (t._isUTC ? "UTC" : "") + "Month"](e, n),
    t)
  }
  function J(e) {
    return null != e ? (X(this, e),
    t.updateOffset(this, !0),
    this) : E(this, "Month")
  }
  function Q() {
    return B(this.year(), this.month())
  }
  function Z(t) {
    var e, n = t._a;
    return n && -2 === u(t).overflow && (e = n[ai] < 0 || n[ai] > 11 ? ai : n[li] < 1 || n[li] > B(n[si], n[ai]) ? li : n[ui] < 0 || n[ui] > 24 || 24 === n[ui] && (0 !== n[ci] || 0 !== n[hi] || 0 !== n[di]) ? ui : n[ci] < 0 || n[ci] > 59 ? ci : n[hi] < 0 || n[hi] > 59 ? hi : n[di] < 0 || n[di] > 999 ? di : -1,
    u(t)._overflowDayOfYear && (si > e || e > li) && (e = li),
    u(t).overflow = e),
    t
  }
  function K(e) {
    t.suppressDeprecationWarnings === !1 && "undefined" != typeof console && console.warn
  }
  function tt(t, e) {
    var n = !0;
    return s(function() {
      return n && (K(t + "\n" + (new Error).stack),
      n = !1),
      e.apply(this, arguments)
    }, e)
  }
  function et(t, e) {
    mi[t] || (K(e),
    mi[t] = !0)
  }
  function nt(t) {
    var e, n, i = t._i, r = gi.exec(i);
    if (r) {
      for (u(t).iso = !0,
      e = 0,
      n = vi.length; n > e; e++)
        if (vi[e][1].exec(i)) {
          t._f = vi[e][0];
          break
        }
      for (e = 0,
      n = yi.length; n > e; e++)
        if (yi[e][1].exec(i)) {
          t._f += (r[6] || " ") + yi[e][0];
          break
        }
      i.match(ei) && (t._f += "Z"),
      wt(t)
    } else
      t._isValid = !1
  }
  function it(e) {
    var n = bi.exec(e._i);
    return null !== n ? void (e._d = new Date(+n[1])) : (nt(e),
    void (e._isValid === !1 && (delete e._isValid,
    t.createFromInputFallback(e))))
  }
  function rt(t, e, n, i, r, o, s) {
    var a = new Date(t,e,n,i,r,o,s);
    return 1970 > t && a.setFullYear(t),
    a
  }
  function ot(t) {
    var e = new Date(Date.UTC.apply(null, arguments));
    return 1970 > t && e.setUTCFullYear(t),
    e
  }
  function st(t) {
    return at(t) ? 366 : 365
  }
  function at(t) {
    return t % 4 === 0 && t % 100 !== 0 || t % 400 === 0
  }
  function lt() {
    return at(this.year())
  }
  function ut(t, e, n) {
    var i, r = n - e, o = n - t.day();
    return o > r && (o -= 7),
    r - 7 > o && (o += 7),
    i = Et(t).add(o, "d"),
    {
      week: Math.ceil(i.dayOfYear() / 7),
      year: i.year()
    }
  }
  function ct(t) {
    return ut(t, this._week.dow, this._week.doy).week
  }
  function ht() {
    return this._week.dow
  }
  function dt() {
    return this._week.doy
  }
  function ft(t) {
    var e = this.localeData().week(this);
    return null == t ? e : this.add(7 * (t - e), "d")
  }
  function pt(t) {
    var e = ut(this, 1, 4).week;
    return null == t ? e : this.add(7 * (t - e), "d")
  }
  function mt(t, e, n, i, r) {
    var o, s = 6 + r - i, a = ot(t, 0, 1 + s), l = a.getUTCDay();
    return r > l && (l += 7),
    n = null != n ? 1 * n : r,
    o = 1 + s + 7 * (e - 1) - l + n,
    {
      year: o > 0 ? t : t - 1,
      dayOfYear: o > 0 ? o : st(t - 1) + o
    }
  }
  function gt(t) {
    var e = Math.round((this.clone().startOf("day") - this.clone().startOf("year")) / 864e5) + 1;
    return null == t ? e : this.add(t - e, "d")
  }
  function vt(t, e, n) {
    return null != t ? t : null != e ? e : n
  }
  function yt(t) {
    var e = new Date;
    return t._useUTC ? [e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()] : [e.getFullYear(), e.getMonth(), e.getDate()]
  }
  function bt(t) {
    var e, n, i, r, o = [];
    if (!t._d) {
      for (i = yt(t),
      t._w && null == t._a[li] && null == t._a[ai] && _t(t),
      t._dayOfYear && (r = vt(t._a[si], i[si]),
      t._dayOfYear > st(r) && (u(t)._overflowDayOfYear = !0),
      n = ot(r, 0, t._dayOfYear),
      t._a[ai] = n.getUTCMonth(),
      t._a[li] = n.getUTCDate()),
      e = 0; 3 > e && null == t._a[e]; ++e)
        t._a[e] = o[e] = i[e];
      for (; 7 > e; e++)
        t._a[e] = o[e] = null == t._a[e] ? 2 === e ? 1 : 0 : t._a[e];
      24 === t._a[ui] && 0 === t._a[ci] && 0 === t._a[hi] && 0 === t._a[di] && (t._nextDay = !0,
      t._a[ui] = 0),
      t._d = (t._useUTC ? ot : rt).apply(null, o),
      null != t._tzm && t._d.setUTCMinutes(t._d.getUTCMinutes() - t._tzm),
      t._nextDay && (t._a[ui] = 24)
    }
  }
  function _t(t) {
    var e, n, i, r, o, s, a;
    e = t._w,
    null != e.GG || null != e.W || null != e.E ? (o = 1,
    s = 4,
    n = vt(e.GG, t._a[si], ut(Et(), 1, 4).year),
    i = vt(e.W, 1),
    r = vt(e.E, 1)) : (o = t._locale._week.dow,
    s = t._locale._week.doy,
    n = vt(e.gg, t._a[si], ut(Et(), o, s).year),
    i = vt(e.w, 1),
    null != e.d ? (r = e.d,
    o > r && ++i) : r = null != e.e ? e.e + o : o),
    a = mt(n, i, r, s, o),
    t._a[si] = a.year,
    t._dayOfYear = a.dayOfYear
  }
  function wt(e) {
    if (e._f === t.ISO_8601)
      return void nt(e);
    e._a = [],
    u(e).empty = !0;
    var n, i, r, o, s, a = "" + e._i, l = a.length, c = 0;
    for (r = F(e._f, e._locale).match(Rn) || [],
    n = 0; n < r.length; n++)
      o = r[n],
      i = (a.match(R(o, e)) || [])[0],
      i && (s = a.substr(0, a.indexOf(i)),
      s.length > 0 && u(e).unusedInput.push(s),
      a = a.slice(a.indexOf(i) + i.length),
      c += i.length),
      qn[o] ? (i ? u(e).empty = !1 : u(e).unusedTokens.push(o),
      U(o, i, e)) : e._strict && !i && u(e).unusedTokens.push(o);
    u(e).charsLeftOver = l - c,
    a.length > 0 && u(e).unusedInput.push(a),
    u(e).bigHour === !0 && e._a[ui] <= 12 && e._a[ui] > 0 && (u(e).bigHour = void 0),
    e._a[ui] = xt(e._locale, e._a[ui], e._meridiem),
    bt(e),
    Z(e)
  }
  function xt(t, e, n) {
    var i;
    return null == n ? e : null != t.meridiemHour ? t.meridiemHour(e, n) : null != t.isPM ? (i = t.isPM(n),
    i && 12 > e && (e += 12),
    i || 12 !== e || (e = 0),
    e) : e
  }
  function kt(t) {
    var e, n, i, r, o;
    if (0 === t._f.length)
      return u(t).invalidFormat = !0,
      void (t._d = new Date(NaN));
    for (r = 0; r < t._f.length; r++)
      o = 0,
      e = d({}, t),
      null != t._useUTC && (e._useUTC = t._useUTC),
      e._f = t._f[r],
      wt(e),
      c(e) && (o += u(e).charsLeftOver,
      o += 10 * u(e).unusedTokens.length,
      u(e).score = o,
      (null == i || i > o) && (i = o,
      n = e));
    s(t, n || e)
  }
  function Ct(t) {
    if (!t._d) {
      var e = S(t._i);
      t._a = [e.year, e.month, e.day || e.date, e.hour, e.minute, e.second, e.millisecond],
      bt(t)
    }
  }
  function Tt(t) {
    var e = new f(Z($t(t)));
    return e._nextDay && (e.add(1, "d"),
    e._nextDay = void 0),
    e
  }
  function $t(t) {
    var e = t._i
      , r = t._f;
    return t._locale = t._locale || C(t._l),
    null === e || void 0 === r && "" === e ? h({
      nullInput: !0
    }) : ("string" == typeof e && (t._i = e = t._locale.preparse(e)),
    p(e) ? new f(Z(e)) : (n(r) ? kt(t) : r ? wt(t) : i(e) ? t._d = e : St(t),
    t))
  }
  function St(e) {
    var o = e._i;
    void 0 === o ? e._d = new Date : i(o) ? e._d = new Date(+o) : "string" == typeof o ? it(e) : n(o) ? (e._a = r(o.slice(0), function(t) {
      return parseInt(t, 10)
    }),
    bt(e)) : "object" == typeof o ? Ct(e) : "number" == typeof o ? e._d = new Date(o) : t.createFromInputFallback(e)
  }
  function Dt(t, e, n, i, r) {
    var o = {};
    return "boolean" == typeof n && (i = n,
    n = void 0),
    o._isAMomentObject = !0,
    o._useUTC = o._isUTC = r,
    o._l = n,
    o._i = t,
    o._f = e,
    o._strict = i,
    Tt(o)
  }
  function Et(t, e, n, i) {
    return Dt(t, e, n, i, !1)
  }
  function Ot(t, e) {
    var i, r;
    if (1 === e.length && n(e[0]) && (e = e[0]),
    !e.length)
      return Et();
    for (i = e[0],
    r = 1; r < e.length; ++r)
      (!e[r].isValid() || e[r][t](i)) && (i = e[r]);
    return i
  }
  function At() {
    var t = [].slice.call(arguments, 0);
    return Ot("isBefore", t)
  }
  function Nt() {
    var t = [].slice.call(arguments, 0);
    return Ot("isAfter", t)
  }
  function jt(t) {
    var e = S(t)
      , n = e.year || 0
      , i = e.quarter || 0
      , r = e.month || 0
      , o = e.week || 0
      , s = e.day || 0
      , a = e.hour || 0
      , l = e.minute || 0
      , u = e.second || 0
      , c = e.millisecond || 0;
    this._milliseconds = +c + 1e3 * u + 6e4 * l + 36e5 * a,
    this._days = +s + 7 * o,
    this._months = +r + 3 * i + 12 * n,
    this._data = {},
    this._locale = C(),
    this._bubble()
  }
  function Mt(t) {
    return t instanceof jt
  }
  function Lt(t, e) {
    j(t, 0, 0, function() {
      var t = this.utcOffset()
        , n = "+";
      return 0 > t && (t = -t,
      n = "-"),
      n + N(~~(t / 60), 2) + e + N(~~t % 60, 2)
    })
  }
  function Pt(t) {
    var e = (t || "").match(ei) || []
      , n = e[e.length - 1] || []
      , i = (n + "").match(Ci) || ["-", 0, 0]
      , r = +(60 * i[1]) + g(i[2]);
    return "+" === i[0] ? r : -r
  }
  function Ft(e, n) {
    var r, o;
    return n._isUTC ? (r = n.clone(),
    o = (p(e) || i(e) ? +e : +Et(e)) - +r,
    r._d.setTime(+r._d + o),
    t.updateOffset(r, !1),
    r) : Et(e).local()
  }
  function It(t) {
    return 15 * -Math.round(t._d.getTimezoneOffset() / 15)
  }
  function Ht(e, n) {
    var i, r = this._offset || 0;
    return null != e ? ("string" == typeof e && (e = Pt(e)),
    Math.abs(e) < 16 && (e = 60 * e),
    !this._isUTC && n && (i = It(this)),
    this._offset = e,
    this._isUTC = !0,
    null != i && this.add(i, "m"),
    r !== e && (!n || this._changeInProgress ? ee(this, Jt(e - r, "m"), 1, !1) : this._changeInProgress || (this._changeInProgress = !0,
    t.updateOffset(this, !0),
    this._changeInProgress = null)),
    this) : this._isUTC ? r : It(this)
  }
  function Rt(t, e) {
    return null != t ? ("string" != typeof t && (t = -t),
    this.utcOffset(t, e),
    this) : -this.utcOffset()
  }
  function Wt(t) {
    return this.utcOffset(0, t)
  }
  function Yt(t) {
    return this._isUTC && (this.utcOffset(0, t),
    this._isUTC = !1,
    t && this.subtract(It(this), "m")),
    this
  }
  function qt() {
    return this._tzm ? this.utcOffset(this._tzm) : "string" == typeof this._i && this.utcOffset(Pt(this._i)),
    this
  }
  function Ut(t) {
    return t = t ? Et(t).utcOffset() : 0,
    (this.utcOffset() - t) % 60 === 0
  }
  function Bt() {
    return this.utcOffset() > this.clone().month(0).utcOffset() || this.utcOffset() > this.clone().month(5).utcOffset()
  }
  function Vt() {
    if ("undefined" != typeof this._isDSTShifted)
      return this._isDSTShifted;
    var t = {};
    if (d(t, this),
    t = $t(t),
    t._a) {
      var e = t._isUTC ? a(t._a) : Et(t._a);
      this._isDSTShifted = this.isValid() && v(t._a, e.toArray()) > 0
    } else
      this._isDSTShifted = !1;
    return this._isDSTShifted
  }
  function zt() {
    return !this._isUTC
  }
  function Gt() {
    return this._isUTC
  }
  function Xt() {
    return this._isUTC && 0 === this._offset
  }
  function Jt(t, e) {
    var n, i, r, s = t, a = null;
    return Mt(t) ? s = {
      ms: t._milliseconds,
      d: t._days,
      M: t._months
    } : "number" == typeof t ? (s = {},
    e ? s[e] = t : s.milliseconds = t) : (a = Ti.exec(t)) ? (n = "-" === a[1] ? -1 : 1,
    s = {
      y: 0,
      d: g(a[li]) * n,
      h: g(a[ui]) * n,
      m: g(a[ci]) * n,
      s: g(a[hi]) * n,
      ms: g(a[di]) * n
    }) : (a = $i.exec(t)) ? (n = "-" === a[1] ? -1 : 1,
    s = {
      y: Qt(a[2], n),
      M: Qt(a[3], n),
      d: Qt(a[4], n),
      h: Qt(a[5], n),
      m: Qt(a[6], n),
      s: Qt(a[7], n),
      w: Qt(a[8], n)
    }) : null == s ? s = {} : "object" == typeof s && ("from"in s || "to"in s) && (r = Kt(Et(s.from), Et(s.to)),
    s = {},
    s.ms = r.milliseconds,
    s.M = r.months),
    i = new jt(s),
    Mt(t) && o(t, "_locale") && (i._locale = t._locale),
    i
  }
  function Qt(t, e) {
    var n = t && parseFloat(t.replace(",", "."));
    return (isNaN(n) ? 0 : n) * e
  }
  function Zt(t, e) {
    var n = {
      milliseconds: 0,
      months: 0
    };
    return n.months = e.month() - t.month() + 12 * (e.year() - t.year()),
    t.clone().add(n.months, "M").isAfter(e) && --n.months,
    n.milliseconds = +e - +t.clone().add(n.months, "M"),
    n
  }
  function Kt(t, e) {
    var n;
    return e = Ft(e, t),
    t.isBefore(e) ? n = Zt(t, e) : (n = Zt(e, t),
    n.milliseconds = -n.milliseconds,
    n.months = -n.months),
    n
  }
  function te(t, e) {
    return function(n, i) {
      var r, o;
      return null === i || isNaN(+i) || (et(e, "moment()." + e + "(period, number) is deprecated. Please use moment()." + e + "(number, period)."),
      o = n,
      n = i,
      i = o),
      n = "string" == typeof n ? +n : n,
      r = Jt(n, i),
      ee(this, r, t),
      this
    }
  }
  function ee(e, n, i, r) {
    var o = n._milliseconds
      , s = n._days
      , a = n._months;
    r = null == r ? !0 : r,
    o && e._d.setTime(+e._d + o * i),
    s && O(e, "Date", E(e, "Date") + s * i),
    a && X(e, E(e, "Month") + a * i),
    r && t.updateOffset(e, s || a)
  }
  function ne(t, e) {
    var n = t || Et()
      , i = Ft(n, this).startOf("day")
      , r = this.diff(i, "days", !0)
      , o = -6 > r ? "sameElse" : -1 > r ? "lastWeek" : 0 > r ? "lastDay" : 1 > r ? "sameDay" : 2 > r ? "nextDay" : 7 > r ? "nextWeek" : "sameElse";
    return this.format(e && e[o] || this.localeData().calendar(o, this, Et(n)))
  }
  function ie() {
    return new f(this)
  }
  function re(t, e) {
    var n;
    return e = $("undefined" != typeof e ? e : "millisecond"),
    "millisecond" === e ? (t = p(t) ? t : Et(t),
    +this > +t) : (n = p(t) ? +t : +Et(t),
    n < +this.clone().startOf(e))
  }
  function oe(t, e) {
    var n;
    return e = $("undefined" != typeof e ? e : "millisecond"),
    "millisecond" === e ? (t = p(t) ? t : Et(t),
    +t > +this) : (n = p(t) ? +t : +Et(t),
    +this.clone().endOf(e) < n)
  }
  function se(t, e, n) {
    return this.isAfter(t, n) && this.isBefore(e, n)
  }
  function ae(t, e) {
    var n;
    return e = $(e || "millisecond"),
    "millisecond" === e ? (t = p(t) ? t : Et(t),
    +this === +t) : (n = +Et(t),
    +this.clone().startOf(e) <= n && n <= +this.clone().endOf(e))
  }
  function le(t, e, n) {
    var i, r, o = Ft(t, this), s = 6e4 * (o.utcOffset() - this.utcOffset());
    return e = $(e),
    "year" === e || "month" === e || "quarter" === e ? (r = ue(this, o),
    "quarter" === e ? r /= 3 : "year" === e && (r /= 12)) : (i = this - o,
    r = "second" === e ? i / 1e3 : "minute" === e ? i / 6e4 : "hour" === e ? i / 36e5 : "day" === e ? (i - s) / 864e5 : "week" === e ? (i - s) / 6048e5 : i),
    n ? r : m(r)
  }
  function ue(t, e) {
    var n, i, r = 12 * (e.year() - t.year()) + (e.month() - t.month()), o = t.clone().add(r, "months");
    return 0 > e - o ? (n = t.clone().add(r - 1, "months"),
    i = (e - o) / (o - n)) : (n = t.clone().add(r + 1, "months"),
    i = (e - o) / (n - o)),
    -(r + i)
  }
  function ce() {
    return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")
  }
  function he() {
    var t = this.clone().utc();
    return 0 < t.year() && t.year() <= 9999 ? "function" == typeof Date.prototype.toISOString ? this.toDate().toISOString() : P(t, "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]") : P(t, "YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]")
  }
  function de(e) {
    var n = P(this, e || t.defaultFormat);
    return this.localeData().postformat(n)
  }
  function fe(t, e) {
    return this.isValid() ? Jt({
      to: this,
      from: t
    }).locale(this.locale()).humanize(!e) : this.localeData().invalidDate()
  }
  function pe(t) {
    return this.from(Et(), t)
  }
  function me(t, e) {
    return this.isValid() ? Jt({
      from: this,
      to: t
    }).locale(this.locale()).humanize(!e) : this.localeData().invalidDate()
  }
  function ge(t) {
    return this.to(Et(), t)
  }
  function ve(t) {
    var e;
    return void 0 === t ? this._locale._abbr : (e = C(t),
    null != e && (this._locale = e),
    this)
  }
  function ye() {
    return this._locale
  }
  function be(t) {
    switch (t = $(t)) {
    case "year":
      this.month(0);
    case "quarter":
    case "month":
      this.date(1);
    case "week":
    case "isoWeek":
    case "day":
      this.hours(0);
    case "hour":
      this.minutes(0);
    case "minute":
      this.seconds(0);
    case "second":
      this.milliseconds(0)
    }
    return "week" === t && this.weekday(0),
    "isoWeek" === t && this.isoWeekday(1),
    "quarter" === t && this.month(3 * Math.floor(this.month() / 3)),
    this
  }
  function _e(t) {
    return t = $(t),
    void 0 === t || "millisecond" === t ? this : this.startOf(t).add(1, "isoWeek" === t ? "week" : t).subtract(1, "ms")
  }
  function we() {
    return +this._d - 6e4 * (this._offset || 0)
  }
  function xe() {
    return Math.floor(+this / 1e3)
  }
  function ke() {
    return this._offset ? new Date(+this) : this._d
  }
  function Ce() {
    var t = this;
    return [t.year(), t.month(), t.date(), t.hour(), t.minute(), t.second(), t.millisecond()]
  }
  function Te() {
    var t = this;
    return {
      years: t.year(),
      months: t.month(),
      date: t.date(),
      hours: t.hours(),
      minutes: t.minutes(),
      seconds: t.seconds(),
      milliseconds: t.milliseconds()
    }
  }
  function $e() {
    return c(this)
  }
  function Se() {
    return s({}, u(this))
  }
  function De() {
    return u(this).overflow
  }
  function Ee(t, e) {
    j(0, [t, t.length], 0, e)
  }
  function Oe(t, e, n) {
    return ut(Et([t, 11, 31 + e - n]), e, n).week
  }
  function Ae(t) {
    var e = ut(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
    return null == t ? e : this.add(t - e, "y")
  }
  function Ne(t) {
    var e = ut(this, 1, 4).year;
    return null == t ? e : this.add(t - e, "y")
  }
  function je() {
    return Oe(this.year(), 1, 4)
  }
  function Me() {
    var t = this.localeData()._week;
    return Oe(this.year(), t.dow, t.doy)
  }
  function Le(t) {
    return null == t ? Math.ceil((this.month() + 1) / 3) : this.month(3 * (t - 1) + this.month() % 3)
  }
  function Pe(t, e) {
    return "string" != typeof t ? t : isNaN(t) ? (t = e.weekdaysParse(t),
    "number" == typeof t ? t : null) : parseInt(t, 10)
  }
  function Fe(t) {
    return this._weekdays[t.day()]
  }
  function Ie(t) {
    return this._weekdaysShort[t.day()]
  }
  function He(t) {
    return this._weekdaysMin[t.day()]
  }
  function Re(t) {
    var e, n, i;
    for (this._weekdaysParse = this._weekdaysParse || [],
    e = 0; 7 > e; e++)
      if (this._weekdaysParse[e] || (n = Et([2e3, 1]).day(e),
      i = "^" + this.weekdays(n, "") + "|^" + this.weekdaysShort(n, "") + "|^" + this.weekdaysMin(n, ""),
      this._weekdaysParse[e] = new RegExp(i.replace(".", ""),"i")),
      this._weekdaysParse[e].test(t))
        return e
  }
  function We(t) {
    var e = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
    return null != t ? (t = Pe(t, this.localeData()),
    this.add(t - e, "d")) : e
  }
  function Ye(t) {
    var e = (this.day() + 7 - this.localeData()._week.dow) % 7;
    return null == t ? e : this.add(t - e, "d")
  }
  function qe(t) {
    return null == t ? this.day() || 7 : this.day(this.day() % 7 ? t : t - 7)
  }
  function Ue(t, e) {
    j(t, 0, 0, function() {
      return this.localeData().meridiem(this.hours(), this.minutes(), e)
    })
  }
  function Be(t, e) {
    return e._meridiemParse
  }
  function Ve(t) {
    return "p" === (t + "").toLowerCase().charAt(0)
  }
  function ze(t, e, n) {
    return t > 11 ? n ? "pm" : "PM" : n ? "am" : "AM"
  }
  function Ge(t, e) {
    e[di] = g(1e3 * ("0." + t))
  }
  function Xe() {
    return this._isUTC ? "UTC" : ""
  }
  function Je() {
    return this._isUTC ? "Coordinated Universal Time" : ""
  }
  function Qe(t) {
    return Et(1e3 * t)
  }
  function Ze() {
    return Et.apply(null, arguments).parseZone()
  }
  function Ke(t, e, n) {
    var i = this._calendar[t];
    return "function" == typeof i ? i.call(e, n) : i
  }
  function tn(t) {
    var e = this._longDateFormat[t]
      , n = this._longDateFormat[t.toUpperCase()];
    return e || !n ? e : (this._longDateFormat[t] = n.replace(/MMMM|MM|DD|dddd/g, function(t) {
      return t.slice(1)
    }),
    this._longDateFormat[t])
  }
  function en() {
    return this._invalidDate
  }
  function nn(t) {
    return this._ordinal.replace("%d", t)
  }
  function rn(t) {
    return t
  }
  function on(t, e, n, i) {
    var r = this._relativeTime[n];
    return "function" == typeof r ? r(t, e, n, i) : r.replace(/%d/i, t)
  }
  function sn(t, e) {
    var n = this._relativeTime[t > 0 ? "future" : "past"];
    return "function" == typeof n ? n(e) : n.replace(/%s/i, e)
  }
  function an(t) {
    var e, n;
    for (n in t)
      e = t[n],
      "function" == typeof e ? this[n] = e : this["_" + n] = e;
    this._ordinalParseLenient = new RegExp(this._ordinalParse.source + "|" + /\d{1,2}/.source)
  }
  function ln(t, e, n, i) {
    var r = C()
      , o = a().set(i, e);
    return r[n](o, t)
  }
  function un(t, e, n, i, r) {
    if ("number" == typeof t && (e = t,
    t = void 0),
    t = t || "",
    null != e)
      return ln(t, e, n, r);
    var o, s = [];
    for (o = 0; i > o; o++)
      s[o] = ln(t, o, n, r);
    return s
  }
  function cn(t, e) {
    return un(t, e, "months", 12, "month")
  }
  function hn(t, e) {
    return un(t, e, "monthsShort", 12, "month")
  }
  function dn(t, e) {
    return un(t, e, "weekdays", 7, "day")
  }
  function fn(t, e) {
    return un(t, e, "weekdaysShort", 7, "day")
  }
  function pn(t, e) {
    return un(t, e, "weekdaysMin", 7, "day")
  }
  function mn() {
    var t = this._data;
    return this._milliseconds = Xi(this._milliseconds),
    this._days = Xi(this._days),
    this._months = Xi(this._months),
    t.milliseconds = Xi(t.milliseconds),
    t.seconds = Xi(t.seconds),
    t.minutes = Xi(t.minutes),
    t.hours = Xi(t.hours),
    t.months = Xi(t.months),
    t.years = Xi(t.years),
    this
  }
  function gn(t, e, n, i) {
    var r = Jt(e, n);
    return t._milliseconds += i * r._milliseconds,
    t._days += i * r._days,
    t._months += i * r._months,
    t._bubble()
  }
  function vn(t, e) {
    return gn(this, t, e, 1)
  }
  function yn(t, e) {
    return gn(this, t, e, -1)
  }
  function bn(t) {
    return 0 > t ? Math.floor(t) : Math.ceil(t)
  }
  function _n() {
    var t, e, n, i, r, o = this._milliseconds, s = this._days, a = this._months, l = this._data;
    return o >= 0 && s >= 0 && a >= 0 || 0 >= o && 0 >= s && 0 >= a || (o += 864e5 * bn(xn(a) + s),
    s = 0,
    a = 0),
    l.milliseconds = o % 1e3,
    t = m(o / 1e3),
    l.seconds = t % 60,
    e = m(t / 60),
    l.minutes = e % 60,
    n = m(e / 60),
    l.hours = n % 24,
    s += m(n / 24),
    r = m(wn(s)),
    a += r,
    s -= bn(xn(r)),
    i = m(a / 12),
    a %= 12,
    l.days = s,
    l.months = a,
    l.years = i,
    this
  }
  function wn(t) {
    return 4800 * t / 146097
  }
  function xn(t) {
    return 146097 * t / 4800
  }
  function kn(t) {
    var e, n, i = this._milliseconds;
    if (t = $(t),
    "month" === t || "year" === t)
      return e = this._days + i / 864e5,
      n = this._months + wn(e),
      "month" === t ? n : n / 12;
    switch (e = this._days + Math.round(xn(this._months)),
    t) {
    case "week":
      return e / 7 + i / 6048e5;
    case "day":
      return e + i / 864e5;
    case "hour":
      return 24 * e + i / 36e5;
    case "minute":
      return 1440 * e + i / 6e4;
    case "second":
      return 86400 * e + i / 1e3;
    case "millisecond":
      return Math.floor(864e5 * e) + i;
    default:
      throw new Error("Unknown unit " + t)
    }
  }
  function Cn() {
    return this._milliseconds + 864e5 * this._days + this._months % 12 * 2592e6 + 31536e6 * g(this._months / 12)
  }
  function Tn(t) {
    return function() {
      return this.as(t)
    }
  }
  function $n(t) {
    return t = $(t),
    this[t + "s"]()
  }
  function Sn(t) {
    return function() {
      return this._data[t]
    }
  }
  function Dn() {
    return m(this.days() / 7)
  }
  function En(t, e, n, i, r) {
    return r.relativeTime(e || 1, !!n, t, i)
  }
  function On(t, e, n) {
    var i = Jt(t).abs()
      , r = hr(i.as("s"))
      , o = hr(i.as("m"))
      , s = hr(i.as("h"))
      , a = hr(i.as("d"))
      , l = hr(i.as("M"))
      , u = hr(i.as("y"))
      , c = r < dr.s && ["s", r] || 1 === o && ["m"] || o < dr.m && ["mm", o] || 1 === s && ["h"] || s < dr.h && ["hh", s] || 1 === a && ["d"] || a < dr.d && ["dd", a] || 1 === l && ["M"] || l < dr.M && ["MM", l] || 1 === u && ["y"] || ["yy", u];
    return c[2] = e,
    c[3] = +t > 0,
    c[4] = n,
    En.apply(null, c)
  }
  function An(t, e) {
    return void 0 === dr[t] ? !1 : void 0 === e ? dr[t] : (dr[t] = e,
    !0)
  }
  function Nn(t) {
    var e = this.localeData()
      , n = On(this, !t, e);
    return t && (n = e.pastFuture(+this, n)),
    e.postformat(n)
  }
  function jn() {
    var t, e, n, i = fr(this._milliseconds) / 1e3, r = fr(this._days), o = fr(this._months);
    t = m(i / 60),
    e = m(t / 60),
    i %= 60,
    t %= 60,
    n = m(o / 12),
    o %= 12;
    var s = n
      , a = o
      , l = r
      , u = e
      , c = t
      , h = i
      , d = this.asSeconds();
    return d ? (0 > d ? "-" : "") + "P" + (s ? s + "Y" : "") + (a ? a + "M" : "") + (l ? l + "D" : "") + (u || c || h ? "T" : "") + (u ? u + "H" : "") + (c ? c + "M" : "") + (h ? h + "S" : "") : "P0D"
  }
  var Mn, Ln, Pn = t.momentProperties = [], Fn = !1, In = {}, Hn = {}, Rn = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g, Wn = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, Yn = {}, qn = {}, Un = /\d/, Bn = /\d\d/, Vn = /\d{3}/, zn = /\d{4}/, Gn = /[+-]?\d{6}/, Xn = /\d\d?/, Jn = /\d{1,3}/, Qn = /\d{1,4}/, Zn = /[+-]?\d{1,6}/, Kn = /\d+/, ti = /[+-]?\d+/, ei = /Z|[+-]\d\d:?\d\d/gi, ni = /[+-]?\d+(\.\d{1,3})?/, ii = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, ri = {}, oi = {}, si = 0, ai = 1, li = 2, ui = 3, ci = 4, hi = 5, di = 6;
  j("M", ["MM", 2], "Mo", function() {
    return this.month() + 1
  }),
  j("MMM", 0, 0, function(t) {
    return this.localeData().monthsShort(this, t)
  }),
  j("MMMM", 0, 0, function(t) {
    return this.localeData().months(this, t)
  }),
  T("month", "M"),
  H("M", Xn),
  H("MM", Xn, Bn),
  H("MMM", ii),
  H("MMMM", ii),
  Y(["M", "MM"], function(t, e) {
    e[ai] = g(t) - 1
  }),
  Y(["MMM", "MMMM"], function(t, e, n, i) {
    var r = n._locale.monthsParse(t, i, n._strict);
    null != r ? e[ai] = r : u(n).invalidMonth = t
  });
  var fi = "January_February_March_April_May_June_July_August_September_October_November_December".split("_")
    , pi = "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_")
    , mi = {};
  t.suppressDeprecationWarnings = !1;
  var gi = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/
    , vi = [["YYYYYY-MM-DD", /[+-]\d{6}-\d{2}-\d{2}/], ["YYYY-MM-DD", /\d{4}-\d{2}-\d{2}/], ["GGGG-[W]WW-E", /\d{4}-W\d{2}-\d/], ["GGGG-[W]WW", /\d{4}-W\d{2}/], ["YYYY-DDD", /\d{4}-\d{3}/]]
    , yi = [["HH:mm:ss.SSSS", /(T| )\d\d:\d\d:\d\d\.\d+/], ["HH:mm:ss", /(T| )\d\d:\d\d:\d\d/], ["HH:mm", /(T| )\d\d:\d\d/], ["HH", /(T| )\d\d/]]
    , bi = /^\/?Date\((\-?\d+)/i;
  t.createFromInputFallback = tt("moment construction falls back to js Date. This is discouraged and will be removed in upcoming major release. Please refer to https://github.com/moment/moment/issues/1407 for more info.", function(t) {
    t._d = new Date(t._i + (t._useUTC ? " UTC" : ""))
  }),
  j(0, ["YY", 2], 0, function() {
    return this.year() % 100
  }),
  j(0, ["YYYY", 4], 0, "year"),
  j(0, ["YYYYY", 5], 0, "year"),
  j(0, ["YYYYYY", 6, !0], 0, "year"),
  T("year", "y"),
  H("Y", ti),
  H("YY", Xn, Bn),
  H("YYYY", Qn, zn),
  H("YYYYY", Zn, Gn),
  H("YYYYYY", Zn, Gn),
  Y(["YYYYY", "YYYYYY"], si),
  Y("YYYY", function(e, n) {
    n[si] = 2 === e.length ? t.parseTwoDigitYear(e) : g(e)
  }),
  Y("YY", function(e, n) {
    n[si] = t.parseTwoDigitYear(e)
  }),
  t.parseTwoDigitYear = function(t) {
    return g(t) + (g(t) > 68 ? 1900 : 2e3)
  }
  ;
  var _i = D("FullYear", !1);
  j("w", ["ww", 2], "wo", "week"),
  j("W", ["WW", 2], "Wo", "isoWeek"),
  T("week", "w"),
  T("isoWeek", "W"),
  H("w", Xn),
  H("ww", Xn, Bn),
  H("W", Xn),
  H("WW", Xn, Bn),
  q(["w", "ww", "W", "WW"], function(t, e, n, i) {
    e[i.substr(0, 1)] = g(t)
  });
  var wi = {
    dow: 0,
    doy: 6
  };
  j("DDD", ["DDDD", 3], "DDDo", "dayOfYear"),
  T("dayOfYear", "DDD"),
  H("DDD", Jn),
  H("DDDD", Vn),
  Y(["DDD", "DDDD"], function(t, e, n) {
    n._dayOfYear = g(t)
  }),
  t.ISO_8601 = function() {}
  ;
  var xi = tt("moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548", function() {
    var t = Et.apply(null, arguments);
    return this > t ? this : t
  })
    , ki = tt("moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548", function() {
    var t = Et.apply(null, arguments);
    return t > this ? this : t
  });
  Lt("Z", ":"),
  Lt("ZZ", ""),
  H("Z", ei),
  H("ZZ", ei),
  Y(["Z", "ZZ"], function(t, e, n) {
    n._useUTC = !0,
    n._tzm = Pt(t)
  });
  var Ci = /([\+\-]|\d\d)/gi;
  t.updateOffset = function() {}
  ;
  var Ti = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/
    , $i = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/;
  Jt.fn = jt.prototype;
  var Si = te(1, "add")
    , Di = te(-1, "subtract");
  t.defaultFormat = "YYYY-MM-DDTHH:mm:ssZ";
  var Ei = tt("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.", function(t) {
    return void 0 === t ? this.localeData() : this.locale(t)
  });
  j(0, ["gg", 2], 0, function() {
    return this.weekYear() % 100
  }),
  j(0, ["GG", 2], 0, function() {
    return this.isoWeekYear() % 100
  }),
  Ee("gggg", "weekYear"),
  Ee("ggggg", "weekYear"),
  Ee("GGGG", "isoWeekYear"),
  Ee("GGGGG", "isoWeekYear"),
  T("weekYear", "gg"),
  T("isoWeekYear", "GG"),
  H("G", ti),
  H("g", ti),
  H("GG", Xn, Bn),
  H("gg", Xn, Bn),
  H("GGGG", Qn, zn),
  H("gggg", Qn, zn),
  H("GGGGG", Zn, Gn),
  H("ggggg", Zn, Gn),
  q(["gggg", "ggggg", "GGGG", "GGGGG"], function(t, e, n, i) {
    e[i.substr(0, 2)] = g(t)
  }),
  q(["gg", "GG"], function(e, n, i, r) {
    n[r] = t.parseTwoDigitYear(e)
  }),
  j("Q", 0, 0, "quarter"),
  T("quarter", "Q"),
  H("Q", Un),
  Y("Q", function(t, e) {
    e[ai] = 3 * (g(t) - 1)
  }),
  j("D", ["DD", 2], "Do", "date"),
  T("date", "D"),
  H("D", Xn),
  H("DD", Xn, Bn),
  H("Do", function(t, e) {
    return t ? e._ordinalParse : e._ordinalParseLenient
  }),
  Y(["D", "DD"], li),
  Y("Do", function(t, e) {
    e[li] = g(t.match(Xn)[0], 10)
  });
  var Oi = D("Date", !0);
  j("d", 0, "do", "day"),
  j("dd", 0, 0, function(t) {
    return this.localeData().weekdaysMin(this, t)
  }),
  j("ddd", 0, 0, function(t) {
    return this.localeData().weekdaysShort(this, t)
  }),
  j("dddd", 0, 0, function(t) {
    return this.localeData().weekdays(this, t)
  }),
  j("e", 0, 0, "weekday"),
  j("E", 0, 0, "isoWeekday"),
  T("day", "d"),
  T("weekday", "e"),
  T("isoWeekday", "E"),
  H("d", Xn),
  H("e", Xn),
  H("E", Xn),
  H("dd", ii),
  H("ddd", ii),
  H("dddd", ii),
  q(["dd", "ddd", "dddd"], function(t, e, n) {
    var i = n._locale.weekdaysParse(t);
    null != i ? e.d = i : u(n).invalidWeekday = t
  }),
  q(["d", "e", "E"], function(t, e, n, i) {
    e[i] = g(t)
  });
  var Ai = "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_")
    , Ni = "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_")
    , ji = "Su_Mo_Tu_We_Th_Fr_Sa".split("_");
  j("H", ["HH", 2], 0, "hour"),
  j("h", ["hh", 2], 0, function() {
    return this.hours() % 12 || 12
  }),
  Ue("a", !0),
  Ue("A", !1),
  T("hour", "h"),
  H("a", Be),
  H("A", Be),
  H("H", Xn),
  H("h", Xn),
  H("HH", Xn, Bn),
  H("hh", Xn, Bn),
  Y(["H", "HH"], ui),
  Y(["a", "A"], function(t, e, n) {
    n._isPm = n._locale.isPM(t),
    n._meridiem = t
  }),
  Y(["h", "hh"], function(t, e, n) {
    e[ui] = g(t),
    u(n).bigHour = !0
  });
  var Mi = /[ap]\.?m?\.?/i
    , Li = D("Hours", !0);
  j("m", ["mm", 2], 0, "minute"),
  T("minute", "m"),
  H("m", Xn),
  H("mm", Xn, Bn),
  Y(["m", "mm"], ci);
  var Pi = D("Minutes", !1);
  j("s", ["ss", 2], 0, "second"),
  T("second", "s"),
  H("s", Xn),
  H("ss", Xn, Bn),
  Y(["s", "ss"], hi);
  var Fi = D("Seconds", !1);
  j("S", 0, 0, function() {
    return ~~(this.millisecond() / 100)
  }),
  j(0, ["SS", 2], 0, function() {
    return ~~(this.millisecond() / 10)
  }),
  j(0, ["SSS", 3], 0, "millisecond"),
  j(0, ["SSSS", 4], 0, function() {
    return 10 * this.millisecond()
  }),
  j(0, ["SSSSS", 5], 0, function() {
    return 100 * this.millisecond()
  }),
  j(0, ["SSSSSS", 6], 0, function() {
    return 1e3 * this.millisecond()
  }),
  j(0, ["SSSSSSS", 7], 0, function() {
    return 1e4 * this.millisecond()
  }),
  j(0, ["SSSSSSSS", 8], 0, function() {
    return 1e5 * this.millisecond()
  }),
  j(0, ["SSSSSSSSS", 9], 0, function() {
    return 1e6 * this.millisecond()
  }),
  T("millisecond", "ms"),
  H("S", Jn, Un),
  H("SS", Jn, Bn),
  H("SSS", Jn, Vn);
  var Ii;
  for (Ii = "SSSS"; Ii.length <= 9; Ii += "S")
    H(Ii, Kn);
  for (Ii = "S"; Ii.length <= 9; Ii += "S")
    Y(Ii, Ge);
  var Hi = D("Milliseconds", !1);
  j("z", 0, 0, "zoneAbbr"),
  j("zz", 0, 0, "zoneName");
  var Ri = f.prototype;
  Ri.add = Si,
  Ri.calendar = ne,
  Ri.clone = ie,
  Ri.diff = le,
  Ri.endOf = _e,
  Ri.format = de,
  Ri.from = fe,
  Ri.fromNow = pe,
  Ri.to = me,
  Ri.toNow = ge,
  Ri.get = A,
  Ri.invalidAt = De,
  Ri.isAfter = re,
  Ri.isBefore = oe,
  Ri.isBetween = se,
  Ri.isSame = ae,
  Ri.isValid = $e,
  Ri.lang = Ei,
  Ri.locale = ve,
  Ri.localeData = ye,
  Ri.max = ki,
  Ri.min = xi,
  Ri.parsingFlags = Se,
  Ri.set = A,
  Ri.startOf = be,
  Ri.subtract = Di,
  Ri.toArray = Ce,
  Ri.toObject = Te,
  Ri.toDate = ke,
  Ri.toISOString = he,
  Ri.toJSON = he,
  Ri.toString = ce,
  Ri.unix = xe,
  Ri.valueOf = we,
  Ri.year = _i,
  Ri.isLeapYear = lt,
  Ri.weekYear = Ae,
  Ri.isoWeekYear = Ne,
  Ri.quarter = Ri.quarters = Le,
  Ri.month = J,
  Ri.daysInMonth = Q,
  Ri.week = Ri.weeks = ft,
  Ri.isoWeek = Ri.isoWeeks = pt,
  Ri.weeksInYear = Me,
  Ri.isoWeeksInYear = je,
  Ri.date = Oi,
  Ri.day = Ri.days = We,
  Ri.weekday = Ye,
  Ri.isoWeekday = qe,
  Ri.dayOfYear = gt,
  Ri.hour = Ri.hours = Li,
  Ri.minute = Ri.minutes = Pi,
  Ri.second = Ri.seconds = Fi,
  Ri.millisecond = Ri.milliseconds = Hi,
  Ri.utcOffset = Ht,
  Ri.utc = Wt,
  Ri.local = Yt,
  Ri.parseZone = qt,
  Ri.hasAlignedHourOffset = Ut,
  Ri.isDST = Bt,
  Ri.isDSTShifted = Vt,
  Ri.isLocal = zt,
  Ri.isUtcOffset = Gt,
  Ri.isUtc = Xt,
  Ri.isUTC = Xt,
  Ri.zoneAbbr = Xe,
  Ri.zoneName = Je,
  Ri.dates = tt("dates accessor is deprecated. Use date instead.", Oi),
  Ri.months = tt("months accessor is deprecated. Use month instead", J),
  Ri.years = tt("years accessor is deprecated. Use year instead", _i),
  Ri.zone = tt("moment().zone is deprecated, use moment().utcOffset instead. https://github.com/moment/moment/issues/1779", Rt);
  var Wi = Ri
    , Yi = {
    sameDay: "[Today at] LT",
    nextDay: "[Tomorrow at] LT",
    nextWeek: "dddd [at] LT",
    lastDay: "[Yesterday at] LT",
    lastWeek: "[Last] dddd [at] LT",
    sameElse: "L"
  }
    , qi = {
    LTS: "h:mm:ss A",
    LT: "h:mm A",
    L: "MM/DD/YYYY",
    LL: "MMMM D, YYYY",
    LLL: "MMMM D, YYYY h:mm A",
    LLLL: "dddd, MMMM D, YYYY h:mm A"
  }
    , Ui = "Invalid date"
    , Bi = "%d"
    , Vi = /\d{1,2}/
    , zi = {
    future: "in %s",
    past: "%s ago",
    s: "a few seconds",
    m: "a minute",
    mm: "%d minutes",
    h: "an hour",
    hh: "%d hours",
    d: "a day",
    dd: "%d days",
    M: "a month",
    MM: "%d months",
    y: "a year",
    yy: "%d years"
  }
    , Gi = y.prototype;
  Gi._calendar = Yi,
  Gi.calendar = Ke,
  Gi._longDateFormat = qi,
  Gi.longDateFormat = tn,
  Gi._invalidDate = Ui,
  Gi.invalidDate = en,
  Gi._ordinal = Bi,
  Gi.ordinal = nn,
  Gi._ordinalParse = Vi,
  Gi.preparse = rn,
  Gi.postformat = rn,
  Gi._relativeTime = zi,
  Gi.relativeTime = on,
  Gi.pastFuture = sn,
  Gi.set = an,
  Gi.months = V,
  Gi._months = fi,
  Gi.monthsShort = z,
  Gi._monthsShort = pi,
  Gi.monthsParse = G,
  Gi.week = ct,
  Gi._week = wi,
  Gi.firstDayOfYear = dt,
  Gi.firstDayOfWeek = ht,
  Gi.weekdays = Fe,
  Gi._weekdays = Ai,
  Gi.weekdaysMin = He,
  Gi._weekdaysMin = ji,
  Gi.weekdaysShort = Ie,
  Gi._weekdaysShort = Ni,
  Gi.weekdaysParse = Re,
  Gi.isPM = Ve,
  Gi._meridiemParse = Mi,
  Gi.meridiem = ze,
  x("en", {
    ordinalParse: /\d{1,2}(th|st|nd|rd)/,
    ordinal: function(t) {
      var e = t % 10
        , n = 1 === g(t % 100 / 10) ? "th" : 1 === e ? "st" : 2 === e ? "nd" : 3 === e ? "rd" : "th";
      return t + n
    }
  }),
  t.lang = tt("moment.lang is deprecated. Use moment.locale instead.", x),
  t.langData = tt("moment.langData is deprecated. Use moment.localeData instead.", C);
  var Xi = Math.abs
    , Ji = Tn("ms")
    , Qi = Tn("s")
    , Zi = Tn("m")
    , Ki = Tn("h")
    , tr = Tn("d")
    , er = Tn("w")
    , nr = Tn("M")
    , ir = Tn("y")
    , rr = Sn("milliseconds")
    , or = Sn("seconds")
    , sr = Sn("minutes")
    , ar = Sn("hours")
    , lr = Sn("days")
    , ur = Sn("months")
    , cr = Sn("years")
    , hr = Math.round
    , dr = {
    s: 45,
    m: 45,
    h: 22,
    d: 26,
    M: 11
  }
    , fr = Math.abs
    , pr = jt.prototype;
  pr.abs = mn,
  pr.add = vn,
  pr.subtract = yn,
  pr.as = kn,
  pr.asMilliseconds = Ji,
  pr.asSeconds = Qi,
  pr.asMinutes = Zi,
  pr.asHours = Ki,
  pr.asDays = tr,
  pr.asWeeks = er,
  pr.asMonths = nr,
  pr.asYears = ir,
  pr.valueOf = Cn,
  pr._bubble = _n,
  pr.get = $n,
  pr.milliseconds = rr,
  pr.seconds = or,
  pr.minutes = sr,
  pr.hours = ar,
  pr.days = lr,
  pr.weeks = Dn,
  pr.months = ur,
  pr.years = cr,
  pr.humanize = Nn,
  pr.toISOString = jn,
  pr.toString = jn,
  pr.toJSON = jn,
  pr.locale = ve,
  pr.localeData = ye,
  pr.toIsoString = tt("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)", jn),
  pr.lang = Ei,
  j("X", 0, 0, "unix"),
  j("x", 0, 0, "valueOf"),
  H("x", ti),
  H("X", ni),
  Y("X", function(t, e, n) {
    n._d = new Date(1e3 * parseFloat(t, 10))
  }),
  Y("x", function(t, e, n) {
    n._d = new Date(g(t))
  }),
  t.version = "2.10.6",
  e(Et),
  t.fn = Wi,
  t.min = At,
  t.max = Nt,
  t.utc = a,
  t.unix = Qe,
  t.months = cn,
  t.isDate = i,
  t.locale = x,
  t.invalid = h,
  t.duration = Jt,
  t.isMoment = p,
  t.weekdays = dn,
  t.parseZone = Ze,
  t.localeData = C,
  t.isDuration = Mt,
  t.monthsShort = hn,
  t.weekdaysMin = pn,
  t.defineLocale = k,
  t.weekdaysShort = fn,
  t.normalizeUnits = $,
  t.relativeTimeThreshold = An;
  var mr = t;
  return mr
}),
function(t, e) {
  function n(t) {
    var e = "";
    if (t = parseInt(t, 10),
    !t || 1 > t)
      return e;
    for (; t; )
      e += "0",
      t -= 1;
    return e
  }
  function i(t, e, i) {
    return null == t && (t = ""),
    t = "" + t,
    (i ? t : "") + n(e - t.length) + (i ? "" : t)
  }
  function r(t) {
    return "[object Array]" === Object.prototype.toString.call(t)
  }
  function o(t) {
    return "[object Object]" === Object.prototype.toString.call(t)
  }
  function s(t, e) {
    for (var n = t.length; n -= 1; )
      if (e(t[n]))
        return t[n]
  }
  function a(t, e) {
    var n, i = 0, r = t.length;
    for ("function" != typeof e && (n = e,
    e = function(t) {
      return t === n
    }
    ); r > i; ) {
      if (e(t[i]))
        return t[i];
      i += 1
    }
  }
  function l(t, e) {
    var n = 0
      , i = t.length;
    if (t && i)
      for (; i > n; ) {
        if (e(t[n], n) === !1)
          return;
        n += 1
      }
  }
  function u(t, e) {
    var n = 0
      , i = t.length
      , r = [];
    if (!t || !i)
      return r;
    for (; i > n; )
      r[n] = e(t[n], n),
      n += 1;
    return r
  }
  function c(t, e) {
    return u(t, function(t) {
      return t[e]
    })
  }
  function h(t) {
    var e = [];
    return l(t, function(t) {
      t && e.push(t)
    }),
    e
  }
  function d(t) {
    var e = [];
    return l(t, function(t) {
      a(e, t) || e.push(t)
    }),
    e
  }
  function f(t, e) {
    var n = [];
    return l(t, function(t) {
      l(e, function(e) {
        t === e && n.push(t)
      })
    }),
    d(n)
  }
  function p(t, e) {
    var n = [];
    return l(t, function(i, r) {
      return e(i) ? void 0 : (n = t.slice(r),
      !1)
    }),
    n
  }
  function m(t, e) {
    var n = t.slice().reverse();
    return p(n, e).reverse()
  }
  function g(t, e) {
    for (var n in e)
      e.hasOwnProperty(n) && (t[n] = e[n]);
    return t
  }
  var v;
  if ("function" == typeof require)
    try {
      v = require("moment")
    } catch (y) {}
  if (!v && t.moment && (v = t.moment),
  !v)
    throw "Moment Duration Format cannot find Moment.js";
  v.duration.fn.format = function() {
    var t, e, s, y, b, _, w = [].slice.call(arguments), x = g({}, this.format.defaults), k = v.duration(this);
    return x.duration = this,
    l(w, function(t) {
      return "string" == typeof t || "function" == typeof t ? void (x.template = t) : "number" == typeof t ? void (x.precision = t) : void (o(t) && g(x, t))
    }),
    s = x.types = r(x.types) ? x.types : x.types.split(" "),
    "function" == typeof x.template && (x.template = x.template.apply(x)),
    t = new RegExp(u(s, function(t) {
      return x[t].source
    }).join("|"),"g"),
    y = function(t) {
      return a(s, function(e) {
        return x[e].test(t)
      })
    }
    ,
    e = u(x.template.match(t), function(t, e) {
      var n = y(t)
        , i = t.length;
      return {
        index: e,
        length: i,
        token: "escape" === n ? t.replace(x.escape, "$1") : t,
        type: "escape" === n || "general" === n ? null : n
      }
    }, this),
    b = f(s, d(h(c(e, "type")))),
    b.length ? (l(b, function(t, n) {
      var i, r, o, s, a;
      i = k.as(t),
      r = i > 0 ? Math.floor(i) : Math.ceil(i),
      o = i - r,
      s = n + 1 === b.length,
      a = !n,
      l(e, function(e) {
        e.type === t && (g(e, {
          value: i,
          wholeValue: r,
          decimalValue: o,
          isLeast: s,
          isMost: a
        }),
        a && null == x.forceLength && e.length > 1 && (x.forceLength = !0))
      }),
      k.subtract(r, t)
    }),
    x.trim && (e = ("left" === x.trim ? p : m)(e, function(t) {
      return !(t.isLeast || null != t.type && t.wholeValue)
    })),
    _ = !1,
    "right" === x.trim && e.reverse(),
    e = u(e, function(t) {
      var e, r;
      if (!t.type)
        return t.token;
      if (e = t.isLeast && x.precision < 0 ? (Math.floor(t.wholeValue * Math.pow(10, x.precision)) * Math.pow(10, -x.precision)).toString() : t.wholeValue.toString(),
      e = e.replace(/^\-/, ""),
      t.length > 1 && (_ || t.isMost || x.forceLength) && (e = i(e, t.length)),
      t.isLeast && x.precision > 0)
        switch (r = t.decimalValue.toString().replace(/^\-/, "").split(/\.|e\-/),
        r.length) {
        case 1:
          e += "." + i(r[0], x.precision, !0).slice(0, x.precision);
          break;
        case 2:
          e += "." + i(r[1], x.precision, !0).slice(0, x.precision);
          break;
        case 3:
          e += "." + i(n(+r[2] - 1) + (r[0] || "0") + r[1], x.precision, !0).slice(0, x.precision);
          break;
        default:
          throw "Moment Duration Format: unable to parse token decimal value."
        }
      return t.isMost && t.value < 0 && (e = "-" + e),
      _ = !0,
      e
    }),
    "right" === x.trim && e.reverse(),
    e.join("")) : c(e, "token").join("")
  }
  ,
  v.duration.fn.format.defaults = {
    escape: /\[(.+?)\]/,
    years: /[Yy]+/,
    months: /M+/,
    weeks: /[Ww]+/,
    days: /[Dd]+/,
    hours: /[Hh]+/,
    minutes: /m+/,
    seconds: /s+/,
    milliseconds: /S+/,
    general: /.+?/,
    types: "escape years months weeks days hours minutes seconds milliseconds general",
    trim: "left",
    precision: 0,
    forceLength: null,
    template: function() {
      var t = this.types
        , e = this.duration
        , n = s(t, function(t) {
        return e._data[t]
      });
      switch (n) {
      case "seconds":
        return "h:mm:ss";
      case "minutes":
        return "d[d] h:mm";
      case "hours":
        return "d[d] h[h]";
      case "days":
        return "M[m] d[d]";
      case "weeks":
        return "y[y] w[w]";
      case "months":
        return "y[y] M[m]";
      case "years":
        return "y[y]";
      default:
        return "y[y] M[m] d[d] h:mm:ss"
      }
    }
  }
}(this),
function() {
  function t(t) {
    this._value = t
  }
  function e(t, e, n, i) {
    var r, o, s = Math.pow(10, e);
    return o = (n(t * s) / s).toFixed(e),
    i && (r = new RegExp("0{1," + i + "}$"),
    o = o.replace(r, "")),
    o
  }
  function n(t, e, n) {
    var i;
    return i = e.indexOf("$") > -1 ? r(t, e, n) : e.indexOf("%") > -1 ? o(t, e, n) : e.indexOf(":") > -1 ? s(t, e) : l(t._value, e, n)
  }
  function i(t, e) {
    var n, i, r, o, s, l = e, u = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"], c = !1;
    if (e.indexOf(":") > -1)
      t._value = a(e);
    else if (e === g)
      t._value = 0;
    else {
      for ("." !== p[m].delimiters.decimal && (e = e.replace(/\./g, "").replace(p[m].delimiters.decimal, ".")),
      n = new RegExp("[^a-zA-Z]" + p[m].abbreviations.thousand + "(?:\\)|(\\" + p[m].currency.symbol + ")?(?:\\))?)?$"),
      i = new RegExp("[^a-zA-Z]" + p[m].abbreviations.million + "(?:\\)|(\\" + p[m].currency.symbol + ")?(?:\\))?)?$"),
      r = new RegExp("[^a-zA-Z]" + p[m].abbreviations.billion + "(?:\\)|(\\" + p[m].currency.symbol + ")?(?:\\))?)?$"),
      o = new RegExp("[^a-zA-Z]" + p[m].abbreviations.trillion + "(?:\\)|(\\" + p[m].currency.symbol + ")?(?:\\))?)?$"),
      s = 0; s <= u.length && !(c = e.indexOf(u[s]) > -1 ? Math.pow(1024, s + 1) : !1); s++)
        ;
      t._value = (c ? c : 1) * (l.match(n) ? Math.pow(10, 3) : 1) * (l.match(i) ? Math.pow(10, 6) : 1) * (l.match(r) ? Math.pow(10, 9) : 1) * (l.match(o) ? Math.pow(10, 12) : 1) * (e.indexOf("%") > -1 ? .01 : 1) * ((e.split("-").length + Math.min(e.split("(").length - 1, e.split(")").length - 1)) % 2 ? 1 : -1) * Number(e.replace(/[^0-9\.]+/g, "")),
      t._value = c ? Math.ceil(t._value) : t._value
    }
    return t._value
  }
  function r(t, e, n) {
    var i, r, o = e.indexOf("$"), s = e.indexOf("("), a = e.indexOf("-"), u = "";
    return e.indexOf(" $") > -1 ? (u = " ",
    e = e.replace(" $", "")) : e.indexOf("$ ") > -1 ? (u = " ",
    e = e.replace("$ ", "")) : e = e.replace("$", ""),
    r = l(t._value, e, n),
    1 >= o ? r.indexOf("(") > -1 || r.indexOf("-") > -1 ? (r = r.split(""),
    i = 1,
    (s > o || a > o) && (i = 0),
    r.splice(i, 0, p[m].currency.symbol + u),
    r = r.join("")) : r = p[m].currency.symbol + u + r : r.indexOf(")") > -1 ? (r = r.split(""),
    r.splice(-1, 0, u + p[m].currency.symbol),
    r = r.join("")) : r = r + u + p[m].currency.symbol,
    r
  }
  function o(t, e, n) {
    var i, r = "", o = 100 * t._value;
    return e.indexOf(" %") > -1 ? (r = " ",
    e = e.replace(" %", "")) : e = e.replace("%", ""),
    i = l(o, e, n),
    i.indexOf(")") > -1 ? (i = i.split(""),
    i.splice(-1, 0, r + "%"),
    i = i.join("")) : i = i + r + "%",
    i
  }
  function s(t) {
    var e = Math.floor(t._value / 60 / 60)
      , n = Math.floor((t._value - 60 * e * 60) / 60)
      , i = Math.round(t._value - 60 * e * 60 - 60 * n);
    return e + ":" + (10 > n ? "0" + n : n) + ":" + (10 > i ? "0" + i : i)
  }
  function a(t) {
    var e = t.split(":")
      , n = 0;
    return 3 === e.length ? (n += 60 * Number(e[0]) * 60,
    n += 60 * Number(e[1]),
    n += Number(e[2])) : 2 === e.length && (n += 60 * Number(e[0]),
    n += Number(e[1])),
    Number(n)
  }
  function l(t, n, i) {
    var r, o, s, a, l, u, c = !1, h = !1, d = !1, f = "", v = !1, y = !1, b = !1, _ = !1, w = !1, x = "", k = "", C = Math.abs(t), T = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"], $ = "", S = !1;
    if (0 === t && null !== g)
      return g;
    if (n.indexOf("(") > -1 ? (c = !0,
    n = n.slice(1, -1)) : n.indexOf("+") > -1 && (h = !0,
    n = n.replace(/\+/g, "")),
    n.indexOf("a") > -1 && (v = n.indexOf("aK") >= 0,
    y = n.indexOf("aM") >= 0,
    b = n.indexOf("aB") >= 0,
    _ = n.indexOf("aT") >= 0,
    w = v || y || b || _,
    n.indexOf(" a") > -1 ? (f = " ",
    n = n.replace(" a", "")) : n = n.replace("a", ""),
    C >= Math.pow(10, 12) && !w || _ ? (f += p[m].abbreviations.trillion,
    t /= Math.pow(10, 12)) : C < Math.pow(10, 12) && C >= Math.pow(10, 9) && !w || b ? (f += p[m].abbreviations.billion,
    t /= Math.pow(10, 9)) : C < Math.pow(10, 9) && C >= Math.pow(10, 6) && !w || y ? (f += p[m].abbreviations.million,
    t /= Math.pow(10, 6)) : (C < Math.pow(10, 6) && C >= Math.pow(10, 3) && !w || v) && (f += p[m].abbreviations.thousand,
    t /= Math.pow(10, 3))),
    n.indexOf("b") > -1)
      for (n.indexOf(" b") > -1 ? (x = " ",
      n = n.replace(" b", "")) : n = n.replace("b", ""),
      s = 0; s <= T.length; s++)
        if (r = Math.pow(1024, s),
        o = Math.pow(1024, s + 1),
        t >= r && o > t) {
          x += T[s],
          r > 0 && (t /= r);
          break
        }
    return n.indexOf("o") > -1 && (n.indexOf(" o") > -1 ? (k = " ",
    n = n.replace(" o", "")) : n = n.replace("o", ""),
    k += p[m].ordinal(t)),
    n.indexOf("[.]") > -1 && (d = !0,
    n = n.replace("[.]", ".")),
    a = t.toString().split(".")[0],
    l = n.split(".")[1],
    u = n.indexOf(","),
    l ? (l.indexOf("[") > -1 ? (l = l.replace("]", ""),
    l = l.split("["),
    $ = e(t, l[0].length + l[1].length, i, l[1].length)) : $ = e(t, l.length, i),
    a = $.split(".")[0],
    $ = $.split(".")[1].length ? p[m].delimiters.decimal + $.split(".")[1] : "",
    d && 0 === Number($.slice(1)) && ($ = "")) : a = e(t, null, i),
    a.indexOf("-") > -1 && (a = a.slice(1),
    S = !0),
    u > -1 && (a = a.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1" + p[m].delimiters.thousands)),
    0 === n.indexOf(".") && (a = ""),
    (c && S ? "(" : "") + (!c && S ? "-" : "") + (!S && h ? "+" : "") + a + $ + (k ? k : "") + (f ? f : "") + (x ? x : "") + (c && S ? ")" : "")
  }
  function u(t, e) {
    p[t] = e
  }
  function c(t) {
    var e = t.toString().split(".");
    return e.length < 2 ? 1 : Math.pow(10, e[1].length)
  }
  function h() {
    var t = Array.prototype.slice.call(arguments);
    return t.reduce(function(t, e) {
      var n = c(t)
        , i = c(e);
      return n > i ? n : i
    }, -(1 / 0))
  }
  var d, f = "1.5.3", p = {}, m = "en", g = null, v = "0,0", y = "undefined" != typeof module && module.exports;
  d = function(e) {
    return d.isNumeral(e) ? e = e.value() : 0 === e || "undefined" == typeof e ? e = 0 : Number(e) || (e = d.fn.unformat(e)),
    new t(Number(e))
  }
  ,
  d.version = f,
  d.isNumeral = function(e) {
    return e instanceof t
  }
  ,
  d.language = function(t, e) {
    if (!t)
      return m;
    if (t && !e) {
      if (!p[t])
        throw new Error("Unknown language : " + t);
      m = t
    }
    return (e || !p[t]) && u(t, e),
    d
  }
  ,
  d.languageData = function(t) {
    if (!t)
      return p[m];
    if (!p[t])
      throw new Error("Unknown language : " + t);
    return p[t]
  }
  ,
  d.language("en", {
    delimiters: {
      thousands: ",",
      decimal: "."
    },
    abbreviations: {
      thousand: "k",
      million: "m",
      billion: "b",
      trillion: "t"
    },
    ordinal: function(t) {
      var e = t % 10;
      return 1 === ~~(t % 100 / 10) ? "th" : 1 === e ? "st" : 2 === e ? "nd" : 3 === e ? "rd" : "th"
    },
    currency: {
      symbol: "$"
    }
  }),
  d.zeroFormat = function(t) {
    g = "string" == typeof t ? t : null
  }
  ,
  d.defaultFormat = function(t) {
    v = "string" == typeof t ? t : "0.0"
  }
  ,
  "function" != typeof Array.prototype.reduce && (Array.prototype.reduce = function(t, e) {
    "use strict";
    if (null === this || "undefined" == typeof this)
      throw new TypeError("Array.prototype.reduce called on null or undefined");
    if ("function" != typeof t)
      throw new TypeError(t + " is not a function");
    var n, i, r = this.length >>> 0, o = !1;
    for (1 < arguments.length && (i = e,
    o = !0),
    n = 0; r > n; ++n)
      this.hasOwnProperty(n) && (o ? i = t(i, this[n], n, this) : (i = this[n],
      o = !0));
    if (!o)
      throw new TypeError("Reduce of empty array with no initial value");
    return i
  }
  ),
  d.fn = t.prototype = {
    clone: function() {
      return d(this)
    },
    format: function(t, e) {
      return n(this, t ? t : v, void 0 !== e ? e : Math.round)
    },
    unformat: function(t) {
      return "[object Number]" === Object.prototype.toString.call(t) ? t : i(this, t ? t : v)
    },
    value: function() {
      return this._value
    },
    valueOf: function() {
      return this._value
    },
    set: function(t) {
      return this._value = Number(t),
      this
    },
    add: function(t) {
      function e(t, e, i, r) {
        return t + n * e
      }
      var n = h.call(null, this._value, t);
      return this._value = [this._value, t].reduce(e, 0) / n,
      this
    },
    subtract: function(t) {
      function e(t, e, i, r) {
        return t - n * e
      }
      var n = h.call(null, this._value, t);
      return this._value = [t].reduce(e, this._value * n) / n,
      this
    },
    multiply: function(t) {
      function e(t, e, n, i) {
        var r = h(t, e);
        return t * r * (e * r) / (r * r)
      }
      return this._value = [this._value, t].reduce(e, 1),
      this
    },
    divide: function(t) {
      function e(t, e, n, i) {
        var r = h(t, e);
        return t * r / (e * r)
      }
      return this._value = [this._value, t].reduce(e),
      this
    },
    difference: function(t) {
      return Math.abs(d(this._value).subtract(t).value())
    }
  },
  y && (module.exports = d),
  "undefined" == typeof ender && (this.numeral = d),
  "function" == typeof define && define.amd && define([], function() {
    return d
  })
}
.call(this),
function() {
  function t(t) {
    this.tokens = [],
    this.tokens.links = {},
    this.options = t || u.defaults,
    this.rules = c.normal,
    this.options.gfm && (this.options.tables ? this.rules = c.tables : this.rules = c.gfm)
  }
  function e(t, e) {
    if (this.options = e || u.defaults,
    this.links = t,
    this.rules = h.normal,
    this.renderer = this.options.renderer || new n,
    this.renderer.options = this.options,
    !this.links)
      throw new Error("Tokens array requires a `links` property.");
    this.options.gfm ? this.options.breaks ? this.rules = h.breaks : this.rules = h.gfm : this.options.pedantic && (this.rules = h.pedantic)
  }
  function n(t) {
    this.options = t || {}
  }
  function i(t) {
    this.tokens = [],
    this.token = null,
    this.options = t || u.defaults,
    this.options.renderer = this.options.renderer || new n,
    this.renderer = this.options.renderer,
    this.renderer.options = this.options
  }
  function r(t, e) {
    return t.replace(e ? /&/g : /&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
  }
  function o(t) {
    return t.replace(/&([#\w]+);/g, function(t, e) {
      return e = e.toLowerCase(),
      "colon" === e ? ":" : "#" === e.charAt(0) ? "x" === e.charAt(1) ? String.fromCharCode(parseInt(e.substring(2), 16)) : String.fromCharCode(+e.substring(1)) : ""
    })
  }
  function s(t, e) {
    return t = t.source,
    e = e || "",
    function n(i, r) {
      return i ? (r = r.source || r,
      r = r.replace(/(^|[^\[])\^/g, "$1"),
      t = t.replace(i, r),
      n) : new RegExp(t,e)
    }
  }
  function a() {}
  function l(t) {
    for (var e, n, i = 1; i < arguments.length; i++) {
      e = arguments[i];
      for (n in e)
        Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n])
    }
    return t
  }
  function u(e, n, o) {
    if (o || "function" == typeof n) {
      o || (o = n,
      n = null),
      n = l({}, u.defaults, n || {});
      var s, a, c = n.highlight, h = 0;
      try {
        s = t.lex(e, n)
      } catch (d) {
        return o(d)
      }
      a = s.length;
      var f = function() {
        var t, e;
        try {
          t = i.parse(s, n)
        } catch (r) {
          e = r
        }
        return n.highlight = c,
        e ? o(e) : o(null, t)
      };
      if (!c || c.length < 3)
        return f();
      if (delete n.highlight,
      !a)
        return f();
      for (; h < s.length; h++)
        !function(t) {
          return "code" !== t.type ? --a || f() : c(t.text, t.lang, function(e, n) {
            return null == n || n === t.text ? --a || f() : (t.text = n,
            t.escaped = !0,
            void (--a || f()))
          })
        }(s[h])
    } else
      try {
        return n && (n = l({}, u.defaults, n)),
        i.parse(t.lex(e, n), n)
      } catch (d) {
        if (d.message += "\nPlease report this to https://github.com/chjj/marked.",
        (n || u.defaults).silent)
          return "<p>An error occured:</p><pre>" + r(d.message + "", !0) + "</pre>";
        throw d
      }
  }
  var c = {
    newline: /^\n+/,
    code: /^( {4}[^\n]+\n*)+/,
    fences: a,
    hr: /^( *[-*_]){3,} *(?:\n+|$)/,
    heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
    nptable: a,
    lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
    blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
    list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
    html: /^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
    table: a,
    paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
    text: /^[^\n]+/
  };
  c.bullet = /(?:[*+-]|\d+\.)/,
  c.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/,
  c.item = s(c.item, "gm")(/bull/g, c.bullet)(),
  c.list = s(c.list)(/bull/g, c.bullet)("hr", "\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))")("def", "\\n+(?=" + c.def.source + ")")(),
  c.blockquote = s(c.blockquote)("def", c.def)(),
  c._tag = "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b",
  c.html = s(c.html)("comment", /<!--[\s\S]*?-->/)("closed", /<(tag)[\s\S]+?<\/\1>/)("closing", /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)(/tag/g, c._tag)(),
  c.paragraph = s(c.paragraph)("hr", c.hr)("heading", c.heading)("lheading", c.lheading)("blockquote", c.blockquote)("tag", "<" + c._tag)("def", c.def)(),
  c.normal = l({}, c),
  c.gfm = l({}, c.normal, {
    fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
    paragraph: /^/
  }),
  c.gfm.paragraph = s(c.paragraph)("(?!", "(?!" + c.gfm.fences.source.replace("\\1", "\\2") + "|" + c.list.source.replace("\\1", "\\3") + "|")(),
  c.tables = l({}, c.gfm, {
    nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
    table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
  }),
  t.rules = c,
  t.lex = function(e, n) {
    var i = new t(n);
    return i.lex(e)
  }
  ,
  t.prototype.lex = function(t) {
    return t = t.replace(/\r\n|\r/g, "\n").replace(/\t/g, "    ").replace(/\u00a0/g, " ").replace(/\u2424/g, "\n"),
    this.token(t, !0)
  }
  ,
  t.prototype.token = function(t, e, n) {
    for (var i, r, o, s, a, l, u, h, d, t = t.replace(/^ +$/gm, ""); t; )
      if ((o = this.rules.newline.exec(t)) && (t = t.substring(o[0].length),
      o[0].length > 1 && this.tokens.push({
        type: "space"
      })),
      o = this.rules.code.exec(t))
        t = t.substring(o[0].length),
        o = o[0].replace(/^ {4}/gm, ""),
        this.tokens.push({
          type: "code",
          text: this.options.pedantic ? o : o.replace(/\n+$/, "")
        });
      else if (o = this.rules.fences.exec(t))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: "code",
          lang: o[2],
          text: o[3]
        });
      else if (o = this.rules.heading.exec(t))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: "heading",
          depth: o[1].length,
          text: o[2]
        });
      else if (e && (o = this.rules.nptable.exec(t))) {
        for (t = t.substring(o[0].length),
        l = {
          type: "table",
          header: o[1].replace(/^ *| *\| *$/g, "").split(/ *\| */),
          align: o[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
          cells: o[3].replace(/\n$/, "").split("\n")
        },
        h = 0; h < l.align.length; h++)
          /^ *-+: *$/.test(l.align[h]) ? l.align[h] = "right" : /^ *:-+: *$/.test(l.align[h]) ? l.align[h] = "center" : /^ *:-+ *$/.test(l.align[h]) ? l.align[h] = "left" : l.align[h] = null;
        for (h = 0; h < l.cells.length; h++)
          l.cells[h] = l.cells[h].split(/ *\| */);
        this.tokens.push(l)
      } else if (o = this.rules.lheading.exec(t))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: "heading",
          depth: "=" === o[2] ? 1 : 2,
          text: o[1]
        });
      else if (o = this.rules.hr.exec(t))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: "hr"
        });
      else if (o = this.rules.blockquote.exec(t))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: "blockquote_start"
        }),
        o = o[0].replace(/^ *> ?/gm, ""),
        this.token(o, e, !0),
        this.tokens.push({
          type: "blockquote_end"
        });
      else if (o = this.rules.list.exec(t)) {
        for (t = t.substring(o[0].length),
        s = o[2],
        this.tokens.push({
          type: "list_start",
          ordered: s.length > 1
        }),
        o = o[0].match(this.rules.item),
        i = !1,
        d = o.length,
        h = 0; d > h; h++)
          l = o[h],
          u = l.length,
          l = l.replace(/^ *([*+-]|\d+\.) +/, ""),
          ~l.indexOf("\n ") && (u -= l.length,
          l = this.options.pedantic ? l.replace(/^ {1,4}/gm, "") : l.replace(new RegExp("^ {1," + u + "}","gm"), "")),
          this.options.smartLists && h !== d - 1 && (a = c.bullet.exec(o[h + 1])[0],
          s === a || s.length > 1 && a.length > 1 || (t = o.slice(h + 1).join("\n") + t,
          h = d - 1)),
          r = i || /\n\n(?!\s*$)/.test(l),
          h !== d - 1 && (i = "\n" === l.charAt(l.length - 1),
          r || (r = i)),
          this.tokens.push({
            type: r ? "loose_item_start" : "list_item_start"
          }),
          this.token(l, !1, n),
          this.tokens.push({
            type: "list_item_end"
          });
        this.tokens.push({
          type: "list_end"
        })
      } else if (o = this.rules.html.exec(t))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: this.options.sanitize ? "paragraph" : "html",
          pre: "pre" === o[1] || "script" === o[1] || "style" === o[1],
          text: o[0]
        });
      else if (!n && e && (o = this.rules.def.exec(t)))
        t = t.substring(o[0].length),
        this.tokens.links[o[1].toLowerCase()] = {
          href: o[2],
          title: o[3]
        };
      else if (e && (o = this.rules.table.exec(t))) {
        for (t = t.substring(o[0].length),
        l = {
          type: "table",
          header: o[1].replace(/^ *| *\| *$/g, "").split(/ *\| */),
          align: o[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
          cells: o[3].replace(/(?: *\| *)?\n$/, "").split("\n")
        },
        h = 0; h < l.align.length; h++)
          /^ *-+: *$/.test(l.align[h]) ? l.align[h] = "right" : /^ *:-+: *$/.test(l.align[h]) ? l.align[h] = "center" : /^ *:-+ *$/.test(l.align[h]) ? l.align[h] = "left" : l.align[h] = null;
        for (h = 0; h < l.cells.length; h++)
          l.cells[h] = l.cells[h].replace(/^ *\| *| *\| *$/g, "").split(/ *\| */);
        this.tokens.push(l)
      } else if (e && (o = this.rules.paragraph.exec(t)))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: "paragraph",
          text: "\n" === o[1].charAt(o[1].length - 1) ? o[1].slice(0, -1) : o[1]
        });
      else if (o = this.rules.text.exec(t))
        t = t.substring(o[0].length),
        this.tokens.push({
          type: "text",
          text: o[0]
        });
      else if (t)
        throw new Error("Infinite loop on byte: " + t.charCodeAt(0));
    return this.tokens
  }
  ;
  var h = {
    escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
    autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
    url: a,
    tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
    link: /^!?\[(inside)\]\(href\)/,
    reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
    nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
    strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
    em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
    code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
    br: /^ {2,}\n(?!\s*$)/,
    del: a,
    text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
  };
  h._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/,
  h._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/,
  h.link = s(h.link)("inside", h._inside)("href", h._href)(),
  h.reflink = s(h.reflink)("inside", h._inside)(),
  h.normal = l({}, h),
  h.pedantic = l({}, h.normal, {
    strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
    em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
  }),
  h.gfm = l({}, h.normal, {
    escape: s(h.escape)("])", "~|])")(),
    url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
    del: /^~~(?=\S)([\s\S]*?\S)~~/,
    text: s(h.text)("]|", "~]|")("|", "|https?://|")()
  }),
  h.breaks = l({}, h.gfm, {
    br: s(h.br)("{2,}", "*")(),
    text: s(h.gfm.text)("{2,}", "*")()
  }),
  e.rules = h,
  e.output = function(t, n, i) {
    var r = new e(n,i);
    return r.output(t)
  }
  ,
  e.prototype.output = function(t) {
    for (var e, n, i, o, s = ""; t; )
      if (o = this.rules.escape.exec(t))
        t = t.substring(o[0].length),
        s += o[1];
      else if (o = this.rules.autolink.exec(t))
        t = t.substring(o[0].length),
        "@" === o[2] ? (n = ":" === o[1].charAt(6) ? this.mangle(o[1].substring(7)) : this.mangle(o[1]),
        i = this.mangle("mailto:") + n) : (n = r(o[1]),
        i = n),
        s += this.renderer.link(i, null, n);
      else if (this.inLink || !(o = this.rules.url.exec(t))) {
        if (o = this.rules.tag.exec(t))
          !this.inLink && /^<a /i.test(o[0]) ? this.inLink = !0 : this.inLink && /^<\/a>/i.test(o[0]) && (this.inLink = !1),
          t = t.substring(o[0].length),
          s += this.options.sanitize ? r(o[0]) : o[0];
        else if (o = this.rules.link.exec(t))
          t = t.substring(o[0].length),
          this.inLink = !0,
          s += this.outputLink(o, {
            href: o[2],
            title: o[3]
          }),
          this.inLink = !1;
        else if ((o = this.rules.reflink.exec(t)) || (o = this.rules.nolink.exec(t))) {
          if (t = t.substring(o[0].length),
          e = (o[2] || o[1]).replace(/\s+/g, " "),
          e = this.links[e.toLowerCase()],
          !e || !e.href) {
            s += o[0].charAt(0),
            t = o[0].substring(1) + t;
            continue
          }
          this.inLink = !0,
          s += this.outputLink(o, e),
          this.inLink = !1
        } else if (o = this.rules.strong.exec(t))
          t = t.substring(o[0].length),
          s += this.renderer.strong(this.output(o[2] || o[1]));
        else if (o = this.rules.em.exec(t))
          t = t.substring(o[0].length),
          s += this.renderer.em(this.output(o[2] || o[1]));
        else if (o = this.rules.code.exec(t))
          t = t.substring(o[0].length),
          s += this.renderer.codespan(r(o[2], !0));
        else if (o = this.rules.br.exec(t))
          t = t.substring(o[0].length),
          s += this.renderer.br();
        else if (o = this.rules.del.exec(t))
          t = t.substring(o[0].length),
          s += this.renderer.del(this.output(o[1]));
        else if (o = this.rules.text.exec(t))
          t = t.substring(o[0].length),
          s += r(this.smartypants(o[0]));
        else if (t)
          throw new Error("Infinite loop on byte: " + t.charCodeAt(0))
      } else
        t = t.substring(o[0].length),
        n = r(o[1]),
        i = n,
        s += this.renderer.link(i, null, n);
    return s
  }
  ,
  e.prototype.outputLink = function(t, e) {
    var n = r(e.href)
      , i = e.title ? r(e.title) : null;
    return "!" !== t[0].charAt(0) ? this.renderer.link(n, i, this.output(t[1])) : this.renderer.image(n, i, r(t[1]))
  }
  ,
  e.prototype.smartypants = function(t) {
    return this.options.smartypants ? t.replace(/--/g, "â€”").replace(/(^|[-\u2014\/(\[{"\s])'/g, "$1â€˜").replace(/'/g, "â€™").replace(/(^|[-\u2014\/(\[{\u2018\s])"/g, "$1â€œ").replace(/"/g, "â€").replace(/\.{3}/g, "â€¦") : t
  }
  ,
  e.prototype.mangle = function(t) {
    for (var e, n = "", i = t.length, r = 0; i > r; r++)
      e = t.charCodeAt(r),
      Math.random() > .5 && (e = "x" + e.toString(16)),
      n += "&#" + e + ";";
    return n
  }
  ,
  n.prototype.code = function(t, e, n) {
    if (this.options.highlight) {
      var i = this.options.highlight(t, e);
      null != i && i !== t && (n = !0,
      t = i)
    }
    return e ? '<pre><code class="' + this.options.langPrefix + r(e, !0) + '">' + (n ? t : r(t, !0)) + "\n</code></pre>\n" : "<pre><code>" + (n ? t : r(t, !0)) + "\n</code></pre>"
  }
  ,
  n.prototype.blockquote = function(t) {
    return "<blockquote>\n" + t + "</blockquote>\n"
  }
  ,
  n.prototype.html = function(t) {
    return t
  }
  ,
  n.prototype.heading = function(t, e, n) {
    return "<h" + e + ' id="' + this.options.headerPrefix + n.toLowerCase().replace(/[^\w]+/g, "-") + '">' + t + "</h" + e + ">\n"
  }
  ,
  n.prototype.hr = function() {
    return this.options.xhtml ? "<hr/>\n" : "<hr>\n"
  }
  ,
  n.prototype.list = function(t, e) {
    var n = e ? "ol" : "ul";
    return "<" + n + ">\n" + t + "</" + n + ">\n"
  }
  ,
  n.prototype.listitem = function(t) {
    return "<li>" + t + "</li>\n"
  }
  ,
  n.prototype.paragraph = function(t) {
    return "<p>" + t + "</p>\n"
  }
  ,
  n.prototype.table = function(t, e) {
    return "<table>\n<thead>\n" + t + "</thead>\n<tbody>\n" + e + "</tbody>\n</table>\n"
  }
  ,
  n.prototype.tablerow = function(t) {
    return "<tr>\n" + t + "</tr>\n"
  }
  ,
  n.prototype.tablecell = function(t, e) {
    var n = e.header ? "th" : "td"
      , i = e.align ? "<" + n + ' style="text-align:' + e.align + '">' : "<" + n + ">";
    return i + t + "</" + n + ">\n"
  }
  ,
  n.prototype.strong = function(t) {
    return "<strong>" + t + "</strong>"
  }
  ,
  n.prototype.em = function(t) {
    return "<em>" + t + "</em>"
  }
  ,
  n.prototype.codespan = function(t) {
    return "<code>" + t + "</code>"
  }
  ,
  n.prototype.br = function() {
    return this.options.xhtml ? "<br/>" : "<br>"
  }
  ,
  n.prototype.del = function(t) {
    return "<del>" + t + "</del>"
  }
  ,
  n.prototype.link = function(t, e, n) {
    if (this.options.sanitize) {
      try {
        var i = decodeURIComponent(o(t)).replace(/[^\w:]/g, "").toLowerCase()
      } catch (r) {
        return ""
      }
      if (0 === i.indexOf("javascript:"))
        return ""
    }
    var s = '<a href="' + t + '"';
    return e && (s += ' title="' + e + '"'),
    s += ">" + n + "</a>"
  }
  ,
  n.prototype.image = function(t, e, n) {
    var i = '<img src="' + t + '" alt="' + n + '"';
    return e && (i += ' title="' + e + '"'),
    i += this.options.xhtml ? "/>" : ">"
  }
  ,
  i.parse = function(t, e, n) {
    var r = new i(e,n);
    return r.parse(t)
  }
  ,
  i.prototype.parse = function(t) {
    this.inline = new e(t.links,this.options,this.renderer),
    this.tokens = t.reverse();
    for (var n = ""; this.next(); )
      n += this.tok();
    return n
  }
  ,
  i.prototype.next = function() {
    return this.token = this.tokens.pop()
  }
  ,
  i.prototype.peek = function() {
    return this.tokens[this.tokens.length - 1] || 0
  }
  ,
  i.prototype.parseText = function() {
    for (var t = this.token.text; "text" === this.peek().type; )
      t += "\n" + this.next().text;
    return this.inline.output(t)
  }
  ,
  i.prototype.tok = function() {
    switch (this.token.type) {
    case "space":
      return "";
    case "hr":
      return this.renderer.hr();
    case "heading":
      return this.renderer.heading(this.inline.output(this.token.text), this.token.depth, this.token.text);
    case "code":
      return this.renderer.code(this.token.text, this.token.lang, this.token.escaped);
    case "table":
      var t, e, n, i, r, o = "", s = "";
      for (n = "",
      t = 0; t < this.token.header.length; t++)
        i = {
          header: !0,
          align: this.token.align[t]
        },
        n += this.renderer.tablecell(this.inline.output(this.token.header[t]), {
          header: !0,
          align: this.token.align[t]
        });
      for (o += this.renderer.tablerow(n),
      t = 0; t < this.token.cells.length; t++) {
        for (e = this.token.cells[t],
        n = "",
        r = 0; r < e.length; r++)
          n += this.renderer.tablecell(this.inline.output(e[r]), {
            header: !1,
            align: this.token.align[r]
          });
        s += this.renderer.tablerow(n)
      }
      return this.renderer.table(o, s);
    case "blockquote_start":
      for (var s = ""; "blockquote_end" !== this.next().type; )
        s += this.tok();
      return this.renderer.blockquote(s);
    case "list_start":
      for (var s = "", a = this.token.ordered; "list_end" !== this.next().type; )
        s += this.tok();
      return this.renderer.list(s, a);
    case "list_item_start":
      for (var s = ""; "list_item_end" !== this.next().type; )
        s += "text" === this.token.type ? this.parseText() : this.tok();
      return this.renderer.listitem(s);
    case "loose_item_start":
      for (var s = ""; "list_item_end" !== this.next().type; )
        s += this.tok();
      return this.renderer.listitem(s);
    case "html":
      var l = this.token.pre || this.options.pedantic ? this.token.text : this.inline.output(this.token.text);
      return this.renderer.html(l);
    case "paragraph":
      return this.renderer.paragraph(this.inline.output(this.token.text));
    case "text":
      return this.renderer.paragraph(this.parseText())
    }
  }
  ,
  a.exec = a,
  u.options = u.setOptions = function(t) {
    return l(u.defaults, t),
    u
  }
  ,
  u.defaults = {
    gfm: !0,
    tables: !0,
    breaks: !1,
    pedantic: !1,
    sanitize: !1,
    smartLists: !1,
    silent: !1,
    highlight: null,
    langPrefix: "lang-",
    smartypants: !1,
    headerPrefix: "",
    renderer: new n,
    xhtml: !1
  },
  u.Parser = i,
  u.parser = i.parse,
  u.Renderer = n,
  u.Lexer = t,
  u.lexer = t.lex,
  u.InlineLexer = e,
  u.inlineLexer = e.output,
  u.parse = u,
  "object" == typeof exports ? module.exports = u : "function" == typeof define && define.amd ? define(function() {
    return u
  }) : this.marked = u
}
.call(function() {
  return this || ("undefined" != typeof window ? window : global)
}());


var youtubeId, player, tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag),
$(window).resize(function() {
  var t = $(window).height() - 55;
  $(".pre-scrollable ").css("height", t)
}),
$(document).ready(function() {
  var t = $(window).height() - 55;
  $(".pre-scrollable ").css("height", t)
}),
String.prototype.replaceAll = function(t, e) {
  var n = this;
  return n.replace(new RegExp(t,"g"), e)
}
;
var topOfComments = $("div.video-details").offset().top;
$(".video-container").on("scroll", function() {
  if (0 == appVideo.mobile) {
    var t = document.getElementById("video-container").scrollTop
      , e = topOfComments
      , n = !1;
    n = t > e ? !0 : !1,
    $(".videoPlayer").toggleClass("sticky", n)
  }
}),
Vue.filter("convertTime", function(t) {
  var e, n = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/, i = 0, r = 0, o = 0;
  if (n.test(t)) {
    var s = n.exec(t);
    s[1] && (i = Number(s[1])),
    s[2] && (r = Number(s[2])),
    s[3] && (o = Number(s[3])),
    e = 3600 * i + 60 * r + o
  }
  return time = moment.duration(1e3 * e - 1e3).format("h:mm:ss"),
  time < 10 ? time = "0:0" + time : time < 60 && (time = "0:" + time),
  time
}),
Vue.filter("points", function(t) {
  return 1 == t ? t + " point" : t + " points"
}),
Vue.filter("relativeTime", function(t) {
  var e = moment(1e3 * t).fromNow(!0);
  return e.indexOf("hours") > -1 ? (e = e.replace("hours", "h"),
  e.replace(" ", "")) : e.indexOf("hour") > -1 ? (e = e.replace("hour", "h"),
  e = e.replace(" ", ""),
  e.replace("an", "1")) : e.indexOf("minutes") > -1 ? (e = e.replace("minutes", "m"),
  e.replace(" ", "")) : e.indexOf("seconds") > -1 ? (e = e.replace("seconds", "s"),
  e.replace(" ", "")) : e
}),
Vue.filter("targetBlank", function(t) {
  var e = t;
  return e = e.replaceAll("<a", '<a target="_Blank" ')
}),
Vue.filter("markdown", function(t) {
  var e = document.createElement("textarea");
  return e.innerHTML = t,
  e.value
}),
Vue.config.unsafeDelimiters = ["{!!", "!!}"],
Vue.config.debug = !0,
Vue.filter("numeral", function(t) {
  if (t > 999)
    var e = numeral(t).format("0.0a");
  else
    var e = t;
  return e
}),
Vue.filter("maxChar", function(t) {
  var e = t;
  return void 0 != e && e.length > 90 && (e = jQuery.trim(e).substring(0, 80).split(" ").slice(0, -1).join(" ") + "..."),
  e
}),
Vue.filter("count", function(t) {
  return t.length
}),
Vue.filter("toUrl", function(t) {
  return "https://img.youtube.com/vi/" + t + "/mqdefault.jpg"
}),
Vue.component("comment", {
  template: "#comment-template",
  props: {
    model: Object
  },
  methods: {
    slide: function(t) {
      $("." + t).toggle(),
      "+" == $("span.id-" + t).text() ? $("span.id-" + t).html("−") : $("span.id-" + t).html("+")
    },
    hasReplies: function(t) {
      return "object" == typeof t ? !0 : !1
    },
    isT1: function(t) {
      return "t1" == t ? !0 : !1
    }
  }
});
var appVideo = new Vue({
  el: "#appVideo",
  data: {
    channel: window.location.pathname.split("/")[2],
    channels: channels,
    videoList: [],
    videosWatched: [],
    playingVideo: [],
    videoPlaying: 0,
    commentList: [],
    loadingComments: !0,
    loadingVideos: !1,
    videoMessage: 'Loading Videos <img src="/img/spin.svg" class="loading" alt="Loading Videos">',
    commentsLoaded: !1,
    autoplay: !0,
    viewingComments: !1,
    mobile: !1
  },
  created: function() {
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (this.mobile = !0),
    this.fetchVideos(),
    window.addEventListener("keyup", this.keys)
  },
  methods: {
    firstVideo: function(t) {
      return 0 === t ? !0 : !1
    },
    lastVideo: function(t) {
      return t === this.videoList.length - 1 ? !0 : !1
    },
    slide: function(t) {
      $("." + t).toggle(),
      "+" == $("span.id-" + t).text() ? $("span.id-" + t).html("−") : $("span.id-" + t).html("+")
    },
    hasChildren: function(t) {
      return this.hasReplies(t) ? "undefinded" === t ? !1 : !0 : !1
    },
    hasReplies: function(t) {
      return "object" == typeof t ? !0 : !1
    },
    getSubReddits: function(channel) {
      return channels.find(function(c) {
        return c.title == channel;
      }).subreddit;
    },
    fetchVideos: function() {
      var self = this;
      var subreddits;
      this.channel || (this.channel = "general");
      if (window.location.pathname.split("/r/").length > 1) {
        subreddits = this.channel;
      } else {
        subreddits = this.getSubReddits(this.channel);
      }
      this.getStorage();
      redditVideoService.loadHot(
        subreddits,
        // item.minNumOfVotes
      ).then(function(t) {
        self.videoList = t,
        t.length > 0 ? (self.loadingVideos = !0,
        self.watched(self.videoList[0].youtubeId)) : self.videoMessage = "Sorry, we couldn't find any videos in /r/" + self.subreddit + ".",
        self.playingVideo = t[0],
        self.playVideo(self.playingVideo)
      })
      .catch(error => console.error(error));
    },
    converter: function(t) {
      return t = marked(t)
    },
    fetchComments: function() {
      this.loadingComments = !0,
      this.commentList = [];
      var t = this.videoList[this.videoPlaying].id;
      this.$http.get("https://rake.tv/api/fetchComments/" + this.subreddit + "/" + t, function(t) {
        this.commentList = t,
        this.loadingComments = !1,
        this.commentsLoaded = !0
      })
    },
    hideComments: function() {
      $(".comment-group").toggle()
    },
    removeComments: function() {
      this.commentsLoaded = !1,
      this.commentList = []
    },
    hasBeenWatched: function(t) {
      return -1 != this.videosWatched.indexOf(t) && t != this.videoList[this.videoPlaying].youtubeId ? !0 : !1
    },
    watched: function(t) {
      -1 == this.videosWatched.indexOf(t) && (this.videosWatched.push(t),
      this.setStorage())
    },
    keys: function(t) {
      t = t || window.event,
      "37" == t.keyCode ? this.prevVideo() : "39" == t.keyCode && this.nextVideo()
    },
    playVideo: function(t) {
      if(player && player.loadVideoById) player.loadVideoById(t.youtubeId, 0, "large");
      // this.fetchComments())
    },
    play: function(t) {
      this.removeComments(),
      this.playingVideo = this.videoList[t],
      this.videoPlaying = t,
      this.loaded = !1,
      this.loading = !1,
      this.watched(this.videoList[t].youtubeId),
      this.mobile ? player.cueVideoById(this.videoList[t].youtubeId, 0, "large") : player.loadVideoById(this.videoList[t].youtubeId, 0, "large")
      // this.fetchComments()
    },
    nextVideo: function() {
      if (this.videoPlaying < this.videoList.length - 1) {
        this.removeComments(),
        this.videoPlaying++,
        this.play(this.videoPlaying);
        var t = $("#toolbox")
          , e = t.scrollTop()
          , n = $(".active").parent().height();
        $(".active").parent().next().height();
        t.scrollTop(e + (n + 1))
      }
    },
    prevVideo: function() {
      if (this.videoPlaying > 0) {
        this.removeComments(),
        this.videoPlaying--,
        this.play(this.videoPlaying);
        var t = $("#toolbox")
          , e = t.scrollTop()
          , n = $(".active").parent().height();
        $(".active").parent().next().height();
        t.scrollTop(e - (n + 1))
      }
    },
    getStorage: function() {
      if (this.storageAvailable("localStorage") && localStorage.getItem("videosWatched")) {
        var t = localStorage.getItem("videosWatched");
        this.videosWatched = JSON.parse(t)
      }
    },
    setStorage: function() {
      if (this.storageAvailable("localStorage")) {
        var t = JSON.stringify(this.videosWatched);
        localStorage.setItem("videosWatched", t)
      }
    },
    storageAvailable: function(t) {
      try {
        var e = window[t]
          , n = "__storage_test__";
        return e.setItem(n, n),
        e.removeItem(n),
        !0
      } catch (i) {
        return !1
      }
    },
    isT1: function(t) {
      return "t1" == t ? !0 : !1
    },
    changeChannel: function(channel) {
      if (this.channel !== channel) {
        this.channel = channel;
        this.fetchVideos()
      }
    }
  },
  beforeDestroy: function() {
    window.removeEventListener("keyup", this.keys)
  }
});

