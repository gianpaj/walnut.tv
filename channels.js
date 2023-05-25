const channels = [
  {
    title: 'reddit',
    subreddit: 'videos',
    minNumOfVotes: 100,
    // youtubeChannels: 'UCsvn_Po0SmunchJYOWpOxMg;UCzQUP1qoWDoEbmsQxvdjxgQ',
  },
    {
    title: 'ai',
    sortBy: 'new',
    youtubeChannels:
      'UCMcoud_ZW7cfxeIugBflSBw;UCjNRVMBVI30Sak_p6HRWhIA;UCvKqTb-65iAmXK59sFNKINQ;UC51g2r_bWOQq-7Y-VwU9sYA;UC1I9F6BNDeC_IKfnJHWHc1w;UC7kjWIK1H8tfmFlzZO-wHMw;UCWN3xxRkmTPmbKwht9FuE5A;UCfzlCWGWYyIQ0aLC5w48gBQ;UCqO40lbcG_j5R3imKDrYijQ;UCG_Zzg8o1RGl2oGFsBj-wSA;UCv83tO5cePwHMt1952IVVHw;UC7kCeZ53sli_9XwuQeFxLqw;UCbfYPyITQ-7l4upoX8nvctg;UC55ODQSvARtgSyc8ThfiepQ;UCc7mIHixNHcnCyPOVRlnloA;UC_tYjTShRLbSg_Tub2sf08Q;UC5Wz4fFacYuON6IKbhSa7Zw;UCDq7SjbgRKty5TgGafW8Clg;UCn8ujwUInbJkBhffxqAPBVQ;UCED3hlYdD0SlCff7jJ8tF3Q;UCpV_X0VrL8-jg3t6wYGS-1g;UC66Ggxy8MHX9DCDohdRYDTA;UCXIa1dlKtpeCEBHObZFQgsA;UCR9j1jqqB5Rse69wjUnbYwA;UCNJ1Ymd5yFuUPtn21xtRbbw;UCbY9xX3_jW5c2fjlZVBI4cg;UChpleBmo18P08aKCIgti38g;UCn2RJFAA1ndipnVJsYAwWOw;UCxRU9z5Jm-r11oQpYFtNQ8g;UCKelCK4ZaO6HeEI1KQjqzWA',
     },
  {
    title: 'crypto',
    sortBy: 'new',
    youtubeChannels:
      'UCI7M65p3A-D3P4v5qW8POxQ;UCJgHxpqfhWEEjYH9cLXqhIQ;UC-dmTM1R31S8uFgPmexxkNg;UCJHb21YKQk1HdsVU7OFwG1A;UCWiiMnsnw5Isc2PP1to9nNw;UCbLhGKVY-bJPcawebgtNfbw;UClgJyzwGs-GyaNxUHcLZrkg;UCEOv-8wHvYC6mzsY2Gm5WcQ;UC9aOLLMQht_1FKRxbQe60NA;UCL0J4MLEdLP0-UyLu0hCktg;UCqK_GSMbpiV8spgD3ZGloSw;UCAl9Ld79qaZxp9JzEOwd3aA;UCLaa5cNN89IN0aLfiz5S49A;UCatItl6C7wJp9txFMbXbSTg;UChktQbmIzLZKSwEZh8yE1Kw;UCRvqjQPSeaWn-uEx-w0XOIg;UC7B3Y1yrg4S7mmgoR-NsfxA;UCVA4RYf58slODnA_jhjePYA;UCOaX0Vu-dWB7bNjFMnbBo2A;UCNNDFn3SFIa1_Ui7RuCYhSw;UCTHq3W46BiAYjKUYZq2qm-Q;UC8__jTM6-_GOkRmOBPrTB0A;UCdzMx7Zhy5va5End1-XJFbA',
     },
 
  {
    title: 'hustle',
    sortBy: 'new',
    youtubeChannels:
      'UCHLhShbj0XD9xLq7wDSTj5A;UC5sADJOJ_wZJZDK0FHBrEqQ;UCUoSr3dQcE_MWlRY1WZmCZA;UC7y3a7URdB-8isvPJKrEIsQ;UCkWVA1_vkY9GLyuLAre97AQ;UCGtXqPiNV8YC0GMUzY-EUFg;UC2ZB_N0Vpg6iB5HxdxWg8gQ;UCKmdas65668BmI97lBlh4uw;UCPjNBjflYl0-HQtUvOx0Ibw;UClWTCPVi-AU9TeCN6FkGARg;UCyaN6mg5u8Cjy2ZI4ikWaug;UCF2v8v8te3_u4xhIQ8tGy1g;UC3r8rBjnMzsdgYC3b1sziwA;UCLtTf_uKt0Itd0NG7txrwXA;UCiemDAS1bXMBTx3jIIOukFg;UCkkhmBWfS7pILYIk0izkc3A;UC36zt_eM_gZQXayw_pAdASg;UCyFqFYfTW2VoIQKylJ04Rtw;UC6t1O76G0jYXOAoYCm153dA;UCIBgYfDjtWlbJhg--Z4sOgQ;UCO3tlaeZ6Z0ZN5frMZI3-uQ;UC3eVdgT1EHwIxG5ynO42XXg;UC1LAjODfg7dnSSrrPGGPPMw;UCzOAAJUiSO2uyu1xyxw__2Q;UCzZbUqnLzYuyJoipDpdDL8w;UChFahjDeMBV67DSXiF5pwBA;UCUyDOdBWhC1MCxEjC46d-zw;UCtx8VrbY0M7oLgzl5M_ELsg;UCfRtwc6K_VU9N4OjNnU2P7g;UCMSYZVlQmyG8_2MkIKzg0kw;UCUvvj5lwue7PspotMDjk5UA;UChObmEJP3bgGUXJGc2ePP3Q;UCPi6sb9M-Kj-j-PKptcUNJQ;UC4bq21IPPbpu0Qrsl7LW0sw;UCcefcZRL2oaA_uBNeo5UOWg;UCO8SO6KTCosQOvdLj68yyQQ;UCznv7Vf9nBdJYvBagFdAHWw;UCdZxojNw026cW3RuA-B1f7w;UCfVPKWScEOPeHx63ws-E9nw;UCRCCrE1uX5Y05cmkXFiviWw;UCidsrMKtX7u_QJDsjAw-vKA;UC0rQo28wJ0WU30W5athbrOA;UCp8mr0kjVyVAmvexLDqB60A;UCS4ITAOQlFP9_ny2Zl5b0ig;UCK-zlnUfoDHzUwXcbddtnkg;UCwB3HiWejAkml1UZ0Qo2bFg;UCAeAB8ABXGoGMbXuYPmiu2A;UCNFGSWVOdVWEe9XJNnfTdyQ;UCJLMboBYME_CLEfwsduI0wQ;UCCKpicnIwBP3VPxBAZWDeNA;UCkCGANrihzExmu9QiqZpPlQ;UCASM0cgfkJxQ1ICmRilfHLw;UCvSXMi2LebwJEM1s4bz5IBA;UCWhJUz6BvjkhaW4AfSrBevw;UCAm8TlOEXTPq2B04yQ0lDuA;UCdIM_XmhsVYbBhl3pgPq3dA;UCPa0bvFsR1mbBpk5mIPFGLA;UCUwkeSWSq3WFd6VSvBb4v7g;UCnkmQCJ4f6rRl1PXCblppvA;UCPbMnGLeHscshhD7PAEnvbw;UCZ59iKBmGRfQlnl73sOX0Lw;UCs5wAPodliO0oVxiTD8ruvg;UCBiCWypofB8i9BOPYUvihhA;UC9cn0TuPq4dnbTY-CBsm8XA;UCNm6S6esHHxJGt13lNaR9VQ;UCL_v4tC26PvOFytV1_eEVSg;UCdazTKVCKYe_tjvjuQQmpgQ;UCKHiA-dJxESze4gFBxk3ygQ',
  },
  
  {
    title: 'curious',
    subreddit: 'mealtimevideos;watchandlearn;biology;psychology;space;philosophy;physics',
    minNumOfVotes: 3,
  },
 
  {
    title: 'docus',
    subreddit: 'documentaries',
    minNumOfVotes: 10,
  },
];

if (typeof document === 'undefined') {
  module.exports = {
    channels,
  };
}
