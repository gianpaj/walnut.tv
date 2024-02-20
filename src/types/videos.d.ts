interface RedditPostData {
  all_awardings: [];
  allow_live_comments: boolean;
  approved_at_utc: null;
  approved_by: null;
  archived: boolean;
  author: string;
  author_flair_background_color: string | null;
  author_flair_css_class: null;
  author_flair_richtext: [];
  author_flair_template_id: string | null;
  author_flair_text: null;
  author_flair_text_color: null;
  author_flair_type: string;
  author_fullname: string;
  author_is_blocked: boolean;
  author_patreon_flair: boolean;
  author_premium: boolean;
  awarders: [];
  banned_at_utc: null;
  banned_by: null;
  can_gild: boolean;
  can_mod_post: boolean;
  category: null;
  clicked: boolean;
  content_categories: null;
  contest_mode: boolean;
  created: number;
  created_utc: number;
  discussion_type: null;
  distinguished: null;
  domain: string;
  downs: number;
  edited: boolean;
  gilded: number;
  gildings: object;
  hidden: boolean;
  hide_score: boolean;
  id: string;
  is_created_from_ads_ui: boolean;
  is_crosspostable: boolean;
  is_meta: boolean;
  is_original_content: boolean;
  is_reddit_media_domain: boolean;
  is_robot_indexable: boolean;
  is_self: boolean;
  is_video: boolean;
  likes: null;
  link_flair_background_color: string;
  link_flair_css_class: string | null;
  link_flair_richtext: string[];
  link_flair_text: null;
  link_flair_text_color: string;
  link_flair_type: string;
  locked: boolean;
  media: {
    oembed?: {
      provider_url: string;
      description: string;
      title: string;
      type: string;
      thumbnail_width: number;
      height: number;
      width: number;
      html: string;
      version: string;
      provider_name: string;
      thumbnail_url: string;
      thumbnail_height: number;
      author_url: string;
    };
    reddit_video?: {
      bitrate_kbps: number;
      dash_url: string;
      duration: number;
      fallback_url: string;
      has_audio: boolean;
      height: number;
      hls_url: string;
      is_gif: boolean;
      scrubber_media_url: string;
      transcoding_status: string;
      width: number;
    };
    type: string;
  };
  media_only: boolean;
  media_embed: {
    content: string;
    width: number;
    scrolling: boolean;
    height: number;
  };
  mod_note: null;
  mod_reason_by: null;
  mod_reason_title: string | null;
  mod_reports: [];
  name: string;
  no_follow: boolean;
  num_comments: number;
  num_crossposts: number;
  num_reports: null;
  over_18: boolean;
  parent_whitelist_status: null;
  permalink: string;
  pinned: boolean;
  post_hint: string;
  preview: object;
  pwls: null;
  quarantine: boolean;
  removal_reason: null;
  removed_by: null;
  removed_by_category: null;
  report_reasons: null;
  saved: boolean;
  score: number;
  secure_media: object;
  secure_media_embed: object[];
  selftext: string;
  selftext_html: null;
  send_replies: boolean;
  spoiler: boolean;
  stickied: boolean;
  subreddit: string;
  subreddit_id: string;
  subreddit_name_prefixed: string;
  subreddit_subscribers: number;
  subreddit_type: string;
  suggested_sort: null;
  thumbnail: string;
  thumbnail_height: number;
  thumbnail_width: number;
  title: string;
  top_awarded_type: string | null;
  total_awards_received: number;
  treatment_tags: [];
  ups: number;
  upvote_ratio: number;
  url: string;
  url_overridden_by_dest: string;
  user_reports: object;
  view_count: null;
  visited: boolean;
  whitelist_status: null;
  wls: null;
}

interface RedditPost {
  kind: "t3";
  data: RedditPostData;
}

interface RedditResponseData {
  kind: string;
  data: {
    after: string;
    dist: number;
    modhash: string;
    geo_filter: string | null;
    children: RedditPost[];
  };
}

interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  // publishedAt: string;
  author: string;
}

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  author: string;
}
