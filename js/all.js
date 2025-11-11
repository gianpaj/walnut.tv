console.log(
  '%c%s',
  'color: green; background: yellow; font-size: 24px;',
  "Thanks for checking Walnut.tv source's code!"
);

console.log("Walnut's code is open sourced at https://github.com/gianpaj/walnut.tv");

const youtubeApiKey = 'AIzaSyD342vuWxFeyEMKANx58qKyECeNsxlv0f8';
const youtubeURL = 'http://www.youtube.com/watch?v=';
const youtubeURLLength = youtubeURL.length;
const embedLength = '/embed/'.length;

const MAX_VIDEOS_PER_CHANNEL = 4;
const YOUTUBE_VIDEO_MAX_AGE_HOURS = 24;
const INITIAL_CHANNEL = 'reddit';

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

  // function dynamicSort(property) {
  //   let sortOrder = 1;
  //   if (property[0] === '-') {
  //     sortOrder = -1;
  //     property = property.substr(1);
  //   }
  //   return function (a, b) {
  //     const result = a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
  //     return result * sortOrder;
  //   };
  // }

  function _loadHot(channel, upsMin, after) {
    return new Promise((result, reject) => {
      if (typeof channel !== 'string') {
        return reject(new Error('Bad channel argument value. Channel should be a string'));
      }
      let query = reddit.hot(channel).limit(50);
      if (after) query = query.after(after);

      query.fetch(
        (res) => {
          if (res.error) return reject(res);
          let videos = res.data.children.filter(isVideoObject);

          if (upsMin) {
            videos = videos.filter((vid) => filterByUpvotes(vid, upsMin));
          }

          videos = videos.map(childObjectToDomainVideoModel).filter((v) => v.type === 'youtube');

          result(videos);
        },
        // err contains the error from Reddit
        (err) => reject(err)
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
    const promises = channel_arr.map((channel) => _loadHot(channel, upsMin));

    const arrayOfArrayOfVideos = await Promise.all(promises);

    let videos = mixElementsFromArraysOfArrays(arrayOfArrayOfVideos);

    const uniq = {};
    // remove duplicate videos
    videos = videos.filter((arr) => !uniq[arr.videoUrl] && (uniq[arr.videoUrl] = true));

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
  const leastAmountOfVids = Math.min.apply(
    null,
    arrayOfArrays.map((arr) => arr.length).filter((arr) => arr)
  );

  if (arrayOfArrays.length === 1) {
    return arrayOfArrays;
  }

  if (arrayOfArrays.filter((arr) => arr.length > 0).length === 0) {
    return [];
  }

  arrayOfArrays = arrayOfArrays.filter((a) => a.length);
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

class YouTubeService {
  initiated = false;
  init() {
    return new Promise((resolve, reject) => {
      // if (!gapi.client) {
      //   return reject(new Error('gapi.client is not defined'));
      // }
      const start = () => {
        gapi.client
          .init({
            apiKey: youtubeApiKey,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
            // scope: 'https://www.googleapis.com/auth/youtube.readonly',
          })
          .then(() => {
            this.initiated = true;
            console.debug('gapi.client initiated');
            resolve();
          })
          .catch((reason) => {
            reject(reason);
            console.log('Error: ' + reason.result.error.message);
          });
      };
      gapi.load('client', start);
    });
  }

  /**
   * Load videos from YouTube channels
   *
   * @async
   * @param {string} channel_s - One or more YouTube channel IDs separated by semicolons (e.g., 'UCxxx;UCyyy')
   * @param {string} sortBy - Sort order for videos ('new' for newest first, otherwise by relevance)
   * @returns {Promise<Array>} Array of video objects with metadata (id, title, channelTitle, description, publishedAt, permalink, youtubeId)
   * @throws {Error} If gapi.client is not initiated
   */
  async loadChannels(channel_s, sortBy) {
    if (!this.initiated) {
      console.error('gapi.client not initiated');
      return;
    }
    const searches = channel_s.split(';').map((channel) => this.getYouTubeChannelSearch(channel));
    const arrayOfArrayOfVideos = await Promise.all(searches);

    let videos = mixElementsFromArraysOfArrays(arrayOfArrayOfVideos);
    videos = [].concat.apply([], videos);
    if (sortBy === 'new') {
      return videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    return videos;
  }

  /**
   * Fetch and format YouTube videos from a given channel
   *
   * @async
   * @param {string} channel - YouTube channel ID
   * @returns {Promise<Array>} Array of formatted video objects filtered by duration
   * @description Retrieves videos from a YouTube channel by:
   *   1. Getting the channel's uploads playlist ID (1 quota unit)
   *   2. Listing playlist items to get video IDs (1 quota unit)
   *   3. Fetching video details (snippet and contentDetails)
   *   4. Filtering out videos shorter than SHORT_LENGTH_IN_SEC
   *   5. Formatting results with title, channel, description, etc.
   * @throws {Error} If channel not found or API call fails
   */
  getYouTubeChannelSearch(channel) {
    // const youtubeApiParams = {};

    // // if it's not a channel id
    // if (channel.length !== 24) {
    //   youtubeApiParams.forUsername = channel;
    // } else {
    //   youtubeApiParams.id = channel;
    // }
    // console.log('youtubeApiParams', youtubeApiParams);
    // use youtube api v3 gapi
    // quota cost of 1 unit.
    return gapi.client.youtube.channels
      .list({
        part: 'contentDetails',
        id: channel,
        // TODO: use channel name. Returns different result schema
        // forUsername: 'Bankless',
        // ...youtubeApiParams,
      })
      .then(
        (res) =>
          // get the youtube related playlist id
          res.result.items[0].contentDetails.relatedPlaylists.uploads
      )
      .then((playlistId) =>
        // quota cost of 1 unit.
        gapi.client.youtube.playlistItems.list({
          part: 'snippet',
          playlistId,
          maxResults: MAX_VIDEOS_PER_CHANNEL,
        })
      )
      .then((res) =>
        // get youtube videos Ids
        res.result.items.map((item) => item.snippet.resourceId.videoId)
      )
      .then((videoIds) =>
        gapi.client.youtube.videos.list({
          part: 'snippet, contentDetails',
          id: videoIds.join(','),
          publishedAfter: new Date(Date.now() - YOUTUBE_VIDEO_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString(),
        })
      )
      .then((res) => res.result.items.map((item) => ({ ...item, ...item.snippet, ...item.contentDetails })))
      .then((snippets) => snippets.filter((snippet) => !this.isShortDuration(snippet)))
      .then((snippets) => this.formatResults(snippets))
      .catch((err) => err);

    // let etag;

    // console.log('etags[channel]', etags[channel]);
    // etag = localStorage.getItem(`etag_${channel}`);
  }

  SHORT_LENGTH_IN_SEC = 120;

  isShortDuration(snippetAndContentDetails) {
    return this.getDurationInSec(snippetAndContentDetails.duration) <= this.SHORT_LENGTH_IN_SEC;
  }

  /**
   * Convert ISO 8601 duration string to seconds
   *
   * @param {string} durationString - ISO 8601 duration format (e.g., 'PT16S', 'PT1H27M11S')
   * @returns {number} Total duration in seconds
   * @description Parses YouTube API duration format and converts to total seconds.
   *   - PT16S = 16 seconds
   *   - PT1H27M11S = 1 hour, 27 minutes, 11 seconds = 5231 seconds
   *   - PT5M = 5 minutes = 300 seconds
   * @example
   *   getDurationInSec('PT16S') // returns 16
   *   getDurationInSec('PT1H27M11S') // returns 5231
   */
  getDurationInSec(durationString) {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(\d+)S/;
    const matches = durationString.match(regex);

    const hours = parseInt(matches[1] || 0);
    const minutes = parseInt(matches[2] || 0);
    const seconds = parseInt(matches[3] || 0);

    const totalSeconds = hours * 60 * 60 + minutes * 60 + seconds;

    return totalSeconds;
  }

  formatResults(snippets) {
    // if (results.status === 304) {
    //   // console.log('304. use cache.', results);
    //   // console.log('cache[channel]', cache[channel]);
    //   let items = localStorage.getItem(`cache_${channel}`);
    //   try {
    //     items = JSON.parse(items);
    //     results.items = items;
    //   } catch (error) {
    //     console.error(error);
    //     return [];
    //   }
    // } else {
    //   // update cache etag
    //   if (channel) {
    //     localStorage.setItem(`etag_${channel}`, results.etag);
    //     localStorage.setItem(`cache_${channel}`, JSON.stringify(results.items));
    //     // console.log('results.etag', results.etag);
    //   }
    // }
    if (!snippets) return null;

    return snippets.map((res) => ({
      // get the snippets video id
      id: res.id,
      youtubeId: res.id,
      permalink: `https://www.youtube.com/watch?v=${res.id}`,
      title: res.title,
      channelTitle: res.channelTitle,
      description: res.description,
      publishedAt: res.publishedAt,
    }));
  }
}

const youtubeService = new YouTubeService();

var youtubeId = 'PEStHkA_6Bo',
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
      autoplay: 0,
      controls: 1,
      showinfo: 0,
      rel: 0,
      iv_load_policy: 3,
      origin: 'https://walnut.tv',
    },
  });
}
let indexToPlay = 0;
function onPlayerReady() {
  // if we're playing a specific video (e.g. /general/b97ih5)
  appVideo.videoList[indexToPlay] && appVideo.play(indexToPlay);
}
function onPlayerError() {
  appVideo.nextVideo();
}
function onPlayerStateChange(t) {
  YT.PlayerState.ENDED === t.data && appVideo.autoplay && appVideo.nextVideo();
}

Vue.config.unsafeDelimiters = ['{!!', '!!}'];
Vue.config.debug = false;
Vue.component('v-select', VueSelect.VueSelect);
Vue.filter('maxChar', function (t) {
  let e = t;
  return (
    void 0 != e && e.length > 90 && (e = jQuery.trim(e).substring(0, 80).split(' ').slice(0, -1).join(' ') + '...'),
    e
  );
});
Vue.filter('toUrl', function (t) {
  return 'https://img.youtube.com/vi/' + t + '/mqdefault.jpg';
});
Vue.filter('shortNumber', function (n) {
  return shortNumber(n);
});

var paths = window.location.pathname.split('/').filter((a) => a);

var loadingVideosMessage = 'Loading Videos <img src="/img/spin.svg" class="loading" alt="Loading Videos">';

var appVideo = new Vue({
  el: '#appVideo',
  data: {
    // autoplay the next video when video has ended (onPlayerStateChange)
    autoplay: false,
    // get the channel after the first slash
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
  created: async function () {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) this.mobile = true;
    this.channel || (this.channel = INITIAL_CHANNEL);

    await youtubeService.init();
    // while (!youtubeService.initiated) {
    //   try {
    //     await sleep(100);
    //     console.log('awaiting youtubeService.initiate');
    //   } catch (error) {
    //     console.error(error);
    //   }
    // }
    this.fetchAllVideos();
    window.addEventListener('keyup', this.keys);
  },
  methods: {
    getSubReddits: (channel) => channels.find((c) => c.title == channel).subreddit,
    getYouTubeChannels: (channel) => channels.find((c) => c.title == channel).youtubeChannels,
    getChannelMinVotes: (channel) => channels.find((c) => c.title == channel).minNumOfVotes,
    fetchAllVideos: function (searchText) {
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
          promises = redditService.loadHot(subreddits, minNumOfVotes);
        } else {
          const channel = channels.find((c) => c.title == this.channel);
          subreddits = channel.subreddit;
          ytChannels = channel.youtubeChannels;
          minNumOfVotes = channel.minNumOfVotes;
          promises = Promise.allSettled([
            subreddits ? redditService.loadHot(subreddits, minNumOfVotes) : [],
            ytChannels ? youtubeService.loadChannels(ytChannels, channel.sortBy) : [],
          ]);
        }
      } else {
        this.channel = null;
        promises = redditService.loadHot(subreddits, minNumOfVotes);
      }
      this.getStorage();
      promises
        .then((resolvers) => {
          resolvers.filter((i) => i.status !== 'fulfilled').forEach((e) => console.error(e));

          resolvers = resolvers.filter((i) => i.status === 'fulfilled').map((i) => i.value);
          const [redditVideos = [], youtubeVideos = []] = resolvers;
          if (window.location.search == '?debug') {
            console.log(
              redditVideos.map((v) => ({
                subreddit: v.permalink.split('/r/')[1].split('/')[0],
                title: v.title,
                link: v.permalink,
                youtubeId: v.youtubeId,
              }))
            );

            console.log(
              youtubeVideos.map((v) => ({
                title: v.title,
                link: v.permalink,
                youtubeId: v.youtubeId,
                publishedAt: v.publishedAt,
              }))
            );
          }
          if (redditVideos.length < 1 && youtubeVideos.length < 1) {
            this.videoMessage = `Come back tomorrow, today's YouTube quota was used for /${this.channel}`;

            if (this.searchInput) {
              this.videoMessage = `Come back tomorrow, today's YouTube quota was used for /r/${this.searchInput}`;
            }
            return;
          }
          this.videoList = mixElementsFromArraysOfArrays([redditVideos, youtubeVideos]);
          // console.log(
          //   'this.videoList',
          //   this.videoList.map((v) => v.publishedAt)
          // );
          // if (searchText) window.history.replaceState(null, null, '/r/' + searchText);
          this.loadingVideos = false;

          // this.playingVideo = redditVideos;
          if (pathname.split('/').length === 3 && pathname.indexOf('/r/') === -1) {
            // find video index to play
            let index = this.videoList.findIndex((v) => v.id === id);
            if (index !== -1) {
              indexToPlay = index;
              this.play(index);
              return;
            }
          }
          // this.watched(this.videoList[0].youtubeId);
          this.play(0);
        })
        .catch((error) => {
          this.videoMessage = 'Sorry, there was an error retrieving videos in /' + this.channel;
          if (this.searchInput) {
            this.videoMessage = `Sorry, there was an error retrieving videos /r/${this.searchInput}`;
          }

          console.error(error);
        });
    },
    onSubmit: function (event) {
      event.preventDefault();
    },
    hasBeenWatched: function (youtubeId) {
      return -1 != this.videosWatched.indexOf(youtubeId) && youtubeId != this.videoList[this.videoPlaying].youtubeId;
    },
    watched: function (i) {
      if (-1 == this.videosWatched.indexOf(i)) {
        this.videosWatched.push(i);
        this.setStorage();
      }
    },
    vote: function (id, num) {
      this.voted = num;
      ga('send', 'event', 'voted', 'click');
    },
    keys: function (evt) {
      evt = evt || window.event;
      '37' == evt.keyCode ? this.prevVideo() : '39' == evt.keyCode && this.nextVideo();
    },
    playVideo: function (t) {
      if (!t.youtubeId) {
        return;
      }
      player?.cueVideoById?.(t.youtubeId);
    },
    play: function (i) {
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
    nextVideo: function () {
      if (this.videoPlaying >= this.videoList.length - 1) {
        return;
      }
      this.videoPlaying++;
      this.play(this.videoPlaying);
      this.scroll(1);
    },
    prevVideo: function () {
      if (this.videoPlaying < 1) return;
      this.videoPlaying--;
      this.play(this.videoPlaying);
      this.scroll(-1);
    },
    scroll: function (num) {
      var e = $('#toolbox').scrollTop();
      var n = $('#toolbox .active').parent().height();
      $('#toolbox').scrollTop(e + num === 1 ? n + 1 : -(n + 1));
    },
    getStorage: function () {
      if (this.storageAvailable() && localStorage.getItem('videosWatched')) {
        var t = localStorage.getItem('videosWatched');
        this.videosWatched = JSON.parse(t);
      }
    },
    setStorage: function () {
      if (this.storageAvailable()) {
        var t = JSON.stringify(this.videosWatched);
        localStorage.setItem('videosWatched', t);
      }
    },
    share: function (video) {
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
    storageAvailable: function () {
      var n = '__storage_test__';
      try {
        window.localStorage.setItem(n, n);
        window.localStorage.removeItem(n);
        return true;
      } catch {
        return false;
      }
    },
    changeChannel: function (channel) {
      this.searchInput = '';
      if (this.channel !== channel) {
        player?.stopVideo();
        this.channel = channel;
        window.history.replaceState(null, null, `/${channel}`);
        this.fetchAllVideos();
      }
      $('#navbar-collapse-1').collapse('hide');
    },
  },
  beforeDestroy: function () {
    window.removeEventListener('keyup', this.keys);
  },
});

$('#shareModal button').click(function () {
  $('#url-text')[0].select();
  try {
    document.execCommand('copy');
  } catch (err) {
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

  const sign = num < 0 ? '-' : '';
  const suffixes = {
    K: 6,
    M: 9,
    B: 12,
    T: 16,
  };

  num = Math.abs(num);
  const size = Math.floor(num).toString().length;

  const exponent = size % 3 === 0 ? size - 3 : size - (size % 3);
  let shortNum = Math.round(10 * (num / Math.pow(10, exponent))) / 10;

  for (const suffix in suffixes) {
    if (exponent < suffixes[suffix]) {
      shortNum += suffix;
      break;
    }
  }

  return sign + shortNum;
}

// eslint-disable-next-line no-undef
tippy('.navbar-brand', {
  placement: 'bottom',
  theme: 'light',
  interactive: true,
  content: '<a href="mailto:hi@walnut.tv">hi@walnut.tv</a>',
});

// const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
