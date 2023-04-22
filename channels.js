const channels = [
  {
    title: 'reddit',
    subreddit: 'videos',
    minNumOfVotes: 100,
    // youtubeChannels: 'UCsvn_Po0SmunchJYOWpOxMg;UCzQUP1qoWDoEbmsQxvdjxgQ',
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
      'UClWTCPVi-AU9TeCN6FkGARg;UCyaN6mg5u8Cjy2ZI4ikWaug;UCF2v8v8te3_u4xhIQ8tGy1g;UC3r8rBjnMzsdgYC3b1sziwA;UCLtTf_uKt0Itd0NG7txrwXA;UCiemDAS1bXMBTx3jIIOukFg;UCkkhmBWfS7pILYIk0izkc3A;UCPjNBjflYl0-HQtUvOx0Ibw;UC36zt_eM_gZQXayw_pAdASg;UCdKmkNBt_d4RgjKoNSdDAAg;UCyFqFYfTW2VoIQKylJ04Rtw;UC6t1O76G0jYXOAoYCm153dA;UCIBgYfDjtWlbJhg--Z4sOgQ;UCO3tlaeZ6Z0ZN5frMZI3-uQ;UC3eVdgT1EHwIxG5ynO42XXg;UC1LAjODfg7dnSSrrPGGPPMw;UCzOAAJUiSO2uyu1xyxw__2Q;UCzZbUqnLzYuyJoipDpdDL8w;UChFahjDeMBV67DSXiF5pwBA;UCUyDOdBWhC1MCxEjC46d-zw;UCtx8VrbY0M7oLgzl5M_ELsg;UCfRtwc6K_VU9N4OjNnU2P7g;UCMSYZVlQmyG8_2MkIKzg0kw;UCUvvj5lwue7PspotMDjk5UA;UChObmEJP3bgGUXJGc2ePP3Q;UCPi6sb9M-Kj-j-PKptcUNJQ;UC4bq21IPPbpu0Qrsl7LW0sw;UCcefcZRL2oaA_uBNeo5UOWg;UCO8SO6KTCosQOvdLj68yyQQ;UC36zt_eM_gZQXayw_pAdASg;UCznv7Vf9nBdJYvBagFdAHWw;UCdZxojNw026cW3RuA-B1f7w;UCfVPKWScEOPeHx63ws-E9nw;UCRCCrE1uX5Y05cmkXFiviWw;UCidsrMKtX7u_QJDsjAw-vKA;UC0rQo28wJ0WU30W5athbrOA;UCp8mr0kjVyVAmvexLDqB60A;UCl-Zrl0QhF66lu1aGXaTbfw;UCS4ITAOQlFP9_ny2Zl5b0ig;UCK-zlnUfoDHzUwXcbddtnkg;UCcnyjTK4IheQN2ycsE7NZTQ;UCwB3HiWejAkml1UZ0Qo2bFg;UCAeAB8ABXGoGMbXuYPmiu2A;UCNFGSWVOdVWEe9XJNnfTdyQ;UCJLMboBYME_CLEfwsduI0wQ;UCCKpicnIwBP3VPxBAZWDeNA;UCkCGANrihzExmu9QiqZpPlQ;UCASM0cgfkJxQ1ICmRilfHLw;UCvSXMi2LebwJEM1s4bz5IBA;UCWhJUz6BvjkhaW4AfSrBevw;UCAm8TlOEXTPq2B04yQ0lDuA;UCdIM_XmhsVYbBhl3pgPq3dA;UCPa0bvFsR1mbBpk5mIPFGLA;UCUwkeSWSq3WFd6VSvBb4v7g;UCTQuKo8v0PaPCvk5aRxc_Yg;UCnkmQCJ4f6rRl1PXCblppvA;UCPbMnGLeHscshhD7PAEnvbw;UCZ59iKBmGRfQlnl73sOX0Lw;UCs5wAPodliO0oVxiTD8ruvg;UCSPYNpQ2fHv9HJ-q6MIMaPw;UCBiCWypofB8i9BOPYUvihhA;UCVneetxSKb5lwa2_6c-qO8Q;UC9cn0TuPq4dnbTY-CBsm8XA;UCNm6S6esHHxJGt13lNaR9VQ;UCL_v4tC26PvOFytV1_eEVSg;UCdazTKVCKYe_tjvjuQQmpgQ;UCKHiA-dJxESze4gFBxk3ygQ',
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
