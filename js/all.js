// eslint-disable-next-line no-console
console.log('%c%s', 'color: green; background: yellow; font-size: 24px;', 'Thanks for checking walnut source code!');
// eslint-disable-next-line no-console
console.log("Walnut's code is open sourced at https://github.com/gianpaj/walnut.tv");

// @ts-nocheck

// var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const channels = [
  {
    title: 'general',
    subreddit: 'videos',
    minNumOfVotes: 100,
    // youtubeChannels: 'UCsvn_Po0SmunchJYOWpOxMg;UCzQUP1qoWDoEbmsQxvdjxgQ',
  },
  {
    title: 'curious',
    subreddit: 'curiousvideos;mealtimevideos;educativevideos;watchandlearn',
    minNumOfVotes: 3,
    youtubeChannels:
      'UCzQUP1qoWDoEbmsQxvdjxgQ;UCDsElQQt_gCZ9LgnW-7v-cQ;UCX6b17PVsYBQ0ip5gyeme-Q;UCmmPgObSUPw1HL2lq6H4ffA;UC7IcJI8PUf5Z3zKxnZvTBog;UCZYTClx2T1of7BRZ86-8fow;UC9uD-W5zQHQuAVT2GdcLCvg',
  },
  {
    title: 'science',
    subreddit: 'biology;psychology;lectures;space;philosophy;physics;math',
    minNumOfVotes: 3,
  },
  {
    title: 'documentaries',
    subreddit: 'documentaries',
    minNumOfVotes: 10,
  },
  {
    title: 'crafts',
    subreddit: 'artisanvideos;maker;howto;woodworking;FastWorkers',
    minNumOfVotes: 5,
    youtubeChannels: 'UCloswWQLpsnzCy-KrJ6CfPw;UCIxAaCJ84uefATKmazDyIjw;UCq6H4g9eVY9WxoboCFd0iRA;UCXvzpK4eKUJysEZ42zjTUdw;',
  },
 
];

const youtubeApiKey = 'AIzaSyD342vuWxFeyEMKANx58qKyECeNsxlv0f8';
const youtubeURL = 'http://www.youtube.com/watch?v=';
const youtubeURLLength = youtubeURL.length;
const embedLength = '/embed/'.length;

function RedditVideoService() {
  function isVideoObject(obj) {
    var data = obj.data;
    // reddit videos
    if (data.is_video === true) return true;

    // debug only - return only reddit videos
    // return false;

    if (data.media !== null) {
      return data.media.type.includes('youtube.com') || data.media.type.includes('vimeo.com');
    }
    return false;
  }

  function filterByUpvotes(video, upsMin) {
    return video.data.ups >= upsMin;
  }

  function childObjectToDomainVideoModel(video) {
    const data = video.data;
    const result = {};
    result.title = data.title;
    result.id = data.id;
    result.permalink = 'https://www.reddit.com/' + data.permalink;
    result.created_utc = data.created_utc;
    result.ups = data.ups;
    result.voted = 0;

    // reddit video
    if (data.is_video) {
      result.videoUrl = data.media.reddit_video.fallback_url;
      result.type = 'reddit';
      return result;
    }

    // youtube video
    if (data.media.type === 'youtube.com') {
      const { oembed } = data.media;
      result.type = 'youtube';

      if (oembed.url && oembed.url.indexOf(youtubeURL) === 0) {
        return (result.videoUrl = oembed.html.substring(youtubeURLLength));
      }
      const { html } = oembed;
      const startIndex = html.indexOf('/embed/') + embedLength;
      const endIndex = html.indexOf('?');
      result.videoUrl = html.substring(startIndex, endIndex);
      result.youtubeId = html.substring(startIndex, endIndex);
    }

    // vimeo video
    if (data.media.type === 'vimeo.com') {
      result.videoUrl = 'vimeo.com';
      result.type = 'vimeo';
    }

    return result;
  }

  // eslint-disable-next-line no-unused-vars
  function dynamicSort(property) {
    let sortOrder = 1;
    if (property[0] === '-') {
      sortOrder = -1;
      property = property.substr(1);
    }
    return function(a, b) {
      const result = a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
      return result * sortOrder;
    };
  }

  function _loadHot(channel, upsMin, after) {
    return new Promise((result, reject) => {
      if (typeof channel !== 'string') {
        return reject(new Error('Bad channel argument value. Channel should be a string'));
      }
      let query = reddit.hot(channel).limit(50);
      if (after) query = query.after(after);

      query.fetch(
        res => {
          if (res.error) return reject(res);
          let videos = res.data.children.filter(isVideoObject);

          if (upsMin) {
            videos = videos.filter(vid => filterByUpvotes(vid, upsMin));
          }

          videos = videos.map(childObjectToDomainVideoModel).filter(v => v.type === 'youtube');

          result(videos);
        },
        // err contains the error from Reddit
        err => reject(err)
      );
    });
  }

  /**
   * Get videos from subreddit(s)
   *
   * @param {string} channel_s one or more channels - e.g. 'funny' or' 'funny;cool'
   * @param {number} upsMin minimum amount of up votes per video
   * TODO: @ param {*} after reddit id to load more videos for multiple channels
   */
  async function loadHot(channel_s, upsMin) {
    const channel_arr = channel_s.split(';');
    // console.warn("fetching", channel_s.length, "channels");
    const promises = channel_arr.map(channel => _loadHot(channel, upsMin));

    const arrayOfArrayOfVideos = await Promise.all(promises);

    let videos = mixElementsFromArraysOfArrays(arrayOfArrayOfVideos);

    const uniq = {};
    // remove duplicate videos
    videos = videos.filter(arr => !uniq[arr.videoUrl] && (uniq[arr.videoUrl] = true));

    return [].concat.apply([], videos);
    // .sort(dynamicSort("created_utc"));
  }

  // public interface
  return {
    loadHot,
  };
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
function mixElementsFromArraysOfArrays(arrayOfArrays) {
  // find the smallest amount of videos for every channel
  const leastAmountOfVids = Math.min.apply(null, arrayOfArrays.map(arr => arr.length).filter(arr => arr));

  if (arrayOfArrays.length === 1) {
    return arrayOfArrays;
  }

  if (arrayOfArrays.filter(arr => arr.length > 0).length === 0) {
    return [];
  }

  arrayOfArrays = arrayOfArrays.filter(a => a.length);
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

const redditService = RedditVideoService();

function YouTubeService() {
  function search(query) {
    // from youtube-api-v3-search npm
    // eslint-disable-next-line no-undef
    return searchYoutube(youtubeApiKey, {
      part: 'snippet',
      type: 'video',
      maxResults: '25',
      // videoEmbeddable: 'true',
      q: query,
    }).then(formatResults);
  }
  async function loadChannels(channel_s) {
    channel_s = channel_s.split(';');
    const searches = channel_s.map(channel => getYouTubeChannelSearch(channel));
    const arrayOfArrayOfVideos = await Promise.all(searches);

    const videos = mixElementsFromArraysOfArrays(arrayOfArrayOfVideos);
    return [].concat.apply([], videos);
  }
  function getYouTubeChannelSearch(channel) {
    // from youtube-api-v3-search npm
    // eslint-disable-next-line no-undef
    return searchYoutube(youtubeApiKey, {
      part: 'snippet',
      type: 'video',
      maxResults: '25',
      publishedAfter: new Date(new Date() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours back => yesterday
      channelId: channel,
      order: 'date',
    }).then(formatResults);
  }
  function formatResults(results) {
    if (!results.items) return null;
    return results.items.map(res => ({
      id: res.id.videoId, // reddit id
      permalink: 'https://www.youtube.com/watch?v=' + res.id.videoId,
      title: res.snippet.title,
      channelTitle: res.snippet.channelTitle,
      description: res.snippet.description,
      youtubeId: res.id.videoId,
      publishedAt: res.snippet.publishedAt,
    }));
  }
  return {
    search,
    loadChannels,
  };
}

const youtubeService = YouTubeService();

var youtubeId,
  player,
  tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// The onYouTubeIframeAPIReady function will execute as soon as the player API code downloads
// eslint-disable-next-line no-unused-vars
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: youtubeId,
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
    playerVars: {
      controls: 1,
      showinfo: 0,
      rel: 0,
      iv_load_policy: 3,
      origin: 'https://walnut.tv',
    },
  });
}
var indexToPlay = 0;
function onPlayerReady() {
  // if we're playing a specific video (e.g. /general/b97ih5)
  appVideo.videoList[indexToPlay] && appVideo.play(indexToPlay);
}
function onPlayerError() {
  appVideo.nextVideo();
}
function onPlayerStateChange(t) {
  0 === t.data && appVideo.autoplay && appVideo.nextVideo();
}

Vue.config.unsafeDelimiters = ['{!!', '!!}'];
Vue.config.debug = false;
Vue.component('v-select', VueSelect.VueSelect);
Vue.filter('maxChar', function(t) {
  var e = t;
  return (
    void 0 != e &&
      e.length > 90 &&
      (e =
        jQuery
          .trim(e)
          .substring(0, 80)
          .split(' ')
          .slice(0, -1)
          .join(' ') + '...'),
    e
  );
});
Vue.filter('toUrl', function(t) {
  return 'https://img.youtube.com/vi/' + t + '/mqdefault.jpg';
});
Vue.filter('shortNumber', function(n) {
  return shortNumber(n);
});

var paths = window.location.pathname.split('/').filter(a => a);

var loadingVideosMessage = 'Loading Videos <img src="/img/spin.svg" class="loading" alt="Loading Videos">';

var appVideo = new Vue({
  el: '#appVideo',
  data: {
    // get the channel after the first slash
    autoplay: true,
    channel: paths.length === 1 && paths[0],
    channels: channels,
    contentType: '', // 'youtube' or 'reddit'
    loadingVideos: true,
    mobile: false,
    options: [],
    playingVideo: [],
    searchInput: null,
    videoList: [],
    videoMessage: loadingVideosMessage,
    videoPlaying: 0,
    videosWatched: [],
    voted: 0,
  },
  created: function() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) this.mobile = true;
    this.channel || (this.channel = 'general');
    this.fetchAllVideos();
    window.addEventListener('keyup', this.keys);
  },
  methods: {
    getSubReddits: channel => channels.find(c => c.title == channel).subreddit,
    getYouTubeChannels: channel => channels.find(c => c.title == channel).youtubeChannels,
    getChannelMinVotes: channel => channels.find(c => c.title == channel).minNumOfVotes,
    fetchAllVideos: function(searchText) {
      let id, minNumOfVotes, ytChannels, promises;
      let subreddits = searchText;
      const { pathname } = window.location;
      this.contentType = 'reddit';
      this.loadingVideos = true;
      this.videoMessage = loadingVideosMessage;
      // if changing channel - changeChannel()
      if (!searchText) {
        if (pathname.split('/').length === 3) {
          id = pathname.split('/')[pathname.split('/').length - 1];
        }

        if (pathname.split('/r/').length > 1) {
          subreddits = this.channel;
          promises = Promise.all([redditService.loadHot(subreddits, minNumOfVotes)]);
        } else {
          subreddits = this.getSubReddits(this.channel);
          ytChannels = this.getYouTubeChannels(this.channel);
          minNumOfVotes = this.getChannelMinVotes(this.channel);
          promises = Promise.all([
            redditService.loadHot(subreddits, minNumOfVotes),
            ytChannels ? youtubeService.loadChannels(ytChannels) : [],
          ]);
        }
      } else {
        this.channel = null;
        promises = Promise.all([redditService.loadHot(subreddits, minNumOfVotes)]);
      }
      this.getStorage();
      promises
        .then(resolvers => {
          const [redditVideos, youtubeVideos = []] = resolvers;
          if (window.location.search == '?debug') {
            // eslint-disable-next-line no-console
            console.log(
              redditVideos.map(v => ({
                subreddit: v.permalink.split('/r/')[1].split('/')[0],
                title: v.title,
                link: v.permalink,
                youtubeId: v.youtubeId,
              }))
            );
            // eslint-disable-next-line no-console
            console.log(
              youtubeVideos.map(v => ({
                title: v.title,
                link: v.permalink,
                youtubeId: v.youtubeId,
                publishedAt: v.publishedAt,
              }))
            );
          }
          if (redditVideos.length < 1 && youtubeVideos.length < 1) {
            this.videoMessage = "Sorry, we couldn't find any videos in /" + this.channel;

            if (this.searchInput) {
              this.videoMessage = `Sorry, we couldn't find any videos in /r/${this.searchInput}`;
            }
            return;
          }
          this.videoList = mixElementsFromArraysOfArrays([redditVideos, youtubeVideos]);
          // if (searchText) window.history.replaceState(null, null, '/r/' + searchText);
          this.loadingVideos = false;

          // this.playingVideo = redditVideos;
          if (pathname.split('/').length === 3 && pathname.indexOf('/r/') === -1) {
            // find video index to play
            let index = this.videoList.findIndex(v => v.id === id);
            if (index !== -1) {
              indexToPlay = index;
              this.play(index);
              return;
            }
          }
          // this.watched(this.videoList[0].youtubeId);
          this.play(0);
        })
        .catch(error => {
          this.videoMessage = 'Sorry, there was an error retrieving videos in /' + this.channel;
          if (this.searchInput) {
            this.videoMessage = `Sorry, there was an error retrieving videos /r/${this.searchInput}`;
          }
          // eslint-disable-next-line no-console
          console.error(error);
        });
    },
    fetchVideosFromYoutube: function(query) {
      this.contentType = 'youtube';
      // eslint-disable-next-line no-undef
      this.loadingVideos = true;
      this.getStorage();
      youtubeService
        .search(query)
        .then(videos => {
          if (videos.length < 1) {
            this.videoMessage = 'Sorry, we couldn\'t find any YouTube videos for "' + query + '"';
            return;
          }
          this.loadingVideos = false;
          this.videoList = videos;
          this.play(0);
        })
        .catch(error => {
          this.videoMessage = 'Sorry, there was an error getting YouTube videos for "' + query + '"';
          // eslint-disable-next-line no-console
          console.error(error);
        });
    },
    /**
     * When the input field is being typed
     * @param {string} value
     */
    onSearch: function(value) {
      this.searchInput = '';
      this.options = [value + ' (YouTube)', value + ' (Subreddit)'];
    },
    onChange: function(value) {
      if (value) this.search(value);
    },
    onSubmit: function(event) {
      event.preventDefault();
    },
    search: function(value) {
      // this.$emit('input', event);
      player.stopVideo();
      if (value && value.includes('YouTube')) {
        value = value.split(' (')[0];

        window.history.replaceState(null, null, '/');
        this.channel = null;
        this.fetchVideosFromYoutube(value);
        return;
      }
      this.searchInput = value;
      if (value) {
        value = value.split(' (')[0];
        window.history.replaceState(null, null, '/r/' + value);
        this.channel = value;
        this.fetchAllVideos(value);
      } else this.fetchAllVideos();
    },
    hasBeenWatched: function(youtubeId) {
      return -1 != this.videosWatched.indexOf(youtubeId) && youtubeId != this.videoList[this.videoPlaying].youtubeId;
    },
    watched: function(i) {
      if (-1 == this.videosWatched.indexOf(i)) {
        this.videosWatched.push(i);
        this.setStorage();
      }
    },
    vote: function(id, num) {
      this.voted = num;
      ga('send', 'event', 'voted', 'click');
    },
    keys: function(evt) {
      evt = evt || window.event;
      '37' == evt.keyCode ? this.prevVideo() : '39' == evt.keyCode && this.nextVideo();
    },
    playVideo: function(t) {
      if (!player || !player.loadVideoById) return;
      this.mobile ? player.cueVideoById(t.youtubeId) : player.loadVideoById(t.youtubeId);
    },
    play: function(i) {
      this.playingVideo = this.videoList[i];
      this.videoPlaying = i;
      this.voted = 0;
      this.watched(this.playingVideo.youtubeId);
      this.playVideo(this.playingVideo);
      if (!this.channel) return;
      if (this.playingVideo.permalink.includes('reddit.com')) {
        window.history.replaceState(null, null, '/' + this.channel + '/' + this.playingVideo.id);
      }
      // else {
      //   console.log('youtube video');
      // }
    },
    nextVideo: function() {
      if (this.videoPlaying >= this.videoList.length - 1) {
        return;
      }
      this.videoPlaying++;
      this.play(this.videoPlaying);
      this.scroll(1);
    },
    prevVideo: function() {
      if (this.videoPlaying < 1) return;
      this.videoPlaying--;
      this.play(this.videoPlaying);
      this.scroll(-1);
    },
    scroll: function(num) {
      var e = $('#toolbox').scrollTop();
      var n = $('#toolbox .active')
        .parent()
        .height();
      $('#toolbox').scrollTop(e + num === 1 ? n + 1 : -(n + 1));
    },
    getStorage: function() {
      if (this.storageAvailable() && localStorage.getItem('videosWatched')) {
        var t = localStorage.getItem('videosWatched');
        this.videosWatched = JSON.parse(t);
      }
    },
    setStorage: function() {
      if (this.storageAvailable()) {
        var t = JSON.stringify(this.videosWatched);
        localStorage.setItem('videosWatched', t);
      }
    },
    share: function(video) {
      var url;
      if (this.channel && this.playingVideo.permalink.includes('reddit.com')) {
        url = `https://walnut.tv/${this.channel}/${video.id}`;
      } else {
        // YouTube
        url = this.playingVideo.permalink;
      }
      $('#shareModal').modal('show');
      // put text into #url-text
      $('#url-text')[0].value = url;
    },
    storageAvailable: function() {
      try {
        var n = '__storage_test__';
        window.localStorage.setItem(n, n);
        window.localStorage.removeItem(n);
        return true;
      } catch (_) {
        return false;
      }
    },
    changeChannel: function(channel) {
      this.searchInput = '';
      if (this.channel !== channel) {
        player.stopVideo();
        this.channel = channel;
        window.history.replaceState(null, null, '/' + channel);
        this.fetchAllVideos();
      }
      $('#navbar-collapse-1').collapse('hide');
    },
  },
  beforeDestroy: function() {
    window.removeEventListener('keyup', this.keys);
  },
});

$('#shareModal button').click(function() {
  $('#url-text')[0].select();
  try {
    document.execCommand('copy');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
});

// from https://github.com/cfj/short-number/blob/master/index.js
function shortNumber(num) {
  if (typeof num !== 'number') {
    throw new TypeError('Expected a number');
  }

  if (num > 1e19) {
    throw new RangeError('Input expected to be < 1e19');
  }

  if (num < -1e19) {
    throw new RangeError('Input expected to be > 1e19');
  }

  if (Math.abs(num) < 1000) {
    return num;
  }

  var shortNumber;
  var exponent;
  var size;
  var sign = num < 0 ? '-' : '';
  var suffixes = {
    K: 6,
    M: 9,
    B: 12,
    T: 16,
  };

  num = Math.abs(num);
  size = Math.floor(num).toString().length;

  exponent = size % 3 === 0 ? size - 3 : size - (size % 3);
  shortNumber = Math.round(10 * (num / Math.pow(10, exponent))) / 10;

  for (var suffix in suffixes) {
    if (exponent < suffixes[suffix]) {
      shortNumber += suffix;
      break;
    }
  }

  return sign + shortNumber;
}

// eslint-disable-next-line no-undef
tippy('.navbar-brand', {
  placement: 'bottom',
  theme: 'light',
  interactive: true,
  content: '<a href="mailto:hi@walnut.tv">hi@walnut.tv</a>',
});
