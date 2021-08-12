const channels = [
  {
    title: 'general',
    subreddit: 'videos',
    minNumOfVotes: 100,
    // youtubeChannels: 'UCsvn_Po0SmunchJYOWpOxMg;UCzQUP1qoWDoEbmsQxvdjxgQ',
  },
  {
    title: 'curious',
    subreddit: 'mealtimevideos;watchandlearn',
    minNumOfVotes: 3,
    youtubeChannels:
      'UCX6b17PVsYBQ0ip5gyeme-Q;UCmmPgObSUPw1HL2lq6H4ffA;UC7IcJI8PUf5Z3zKxnZvTBog;UCZYTClx2T1of7BRZ86-8fow;UC9uD-W5zQHQuAVT2GdcLCvg;UCsXVk37bltHxD1rDPwtNM8Q;UC6107grRI4m0o2-emgoDnAA;UCHnyfMqiRRG1u-2MsSQLbXA;UC6nSFpj9HTCZ5t-N3Rm3-HA;UC7DdEm33SyaTDtWYGO2CwdA;UC3KEoMzNz8eYnwBC34RaKCQ;UCt_t6FwNsqr3WWoL6dFqG9w;UClIZqOLqUCro7bKztUjYCNA;UCC552Sd-3nyi_tk2BudLUzA;UCYLrBefhyp8YyI9VGPbghvw;UCH4BNI0-FOK2dMXoFtViWHw;UCeiYXex_fwgYDonaTcSIk6w;UC7_gcs09iThXybpVgjHZ_7g;UCpJmBQ8iNHXeQ7jQWDyGe3A;UCfMJ2MchTSW2kWaT0kK94Yw;UCtHaxi4GTYDpJgMSGy7AeSw;UCHsRtomD4twRf5WVHHk-cMw;UCbwp5B-uDBy-fS4bDA0TEaw;UCj1VqrHhDte54oLgPG4xpuQ;UCIRiWCPZoUyZDbydIqitHtQ;UCY1kMZp36IQSyNx_9h4mpCg;UC9RM-iSvTu1uPJb8X5yp3EQ;UCEik-U3T6u6JA0XiHLbNbOw;UCYO_jab_esuFRV4b17AJtAw;UCR1IuLEqb6UEA_zQ81kwXfg;UCtxJFU9DgUhfr2J2bveCHkQ;UCEIwxahdLz7bap-VDs9h35A;UCBa659QWEk1AI4Tg--mrJ2A;UCP5tjEmvPItGyLhmjdwP7Ww;UCUHW94eEFW7hkUMVaZz4eDg;UCzWQYUVCpZqtN93H8RR44Qw',
  },

  {
    title: 'science',
    subreddit: 'biology;psychology;lectures;space;philosophy;physics;math',
    minNumOfVotes: 3,
  },
  {
    title: 'docus',
    subreddit: 'documentaries',
    minNumOfVotes: 10,
  },
  {
    title: 'hustle',
    youtubeChannels:
      'UCyaN6mg5u8Cjy2ZI4ikWaug;UCF2v8v8te3_u4xhIQ8tGy1g;UC1LAjODfg7dnSSrrPGGPPMw;UCK-zlnUfoDHzUwXcbddtnkg;UCfRtwc6K_VU9N4OjNnU2P7g;UCfRtwc6K_VU9N4OjNnU2P7g;UC4bq21IPPbpu0Qrsl7LW0sw;UCcefcZRL2oaA_uBNeo5UOWg;UCGy7SkBjcIAgTiwkXEtPnYg;UCO8SO6KTCosQOvdLj68yyQQ;UC36zt_eM_gZQXayw_pAdASg;UCESLZhusAkFfsNsApnjF_Cg;UCdZxojNw026cW3RuA-B1f7w;UCfVPKWScEOPeHx63ws-E9nw;UCRCCrE1uX5Y05cmkXFiviWw;UCoOjH8D2XAgjzQlneM2W0EQ;UCkkhmBWfS7pILYIk0izkc3A;UCidsrMKtX7u_QJDsjAw-vKA;UCbVefFvKHAKAvuCCN0gmssg;UC0rQo28wJ0WU30W5athbrOA;UCznv7Vf9nBdJYvBagFdAHWw',
  },
];

if (typeof document === 'undefined') {
  module.exports = {
    channels,
  };
}
