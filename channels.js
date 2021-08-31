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
    title: 'hustle',
    youtubeChannels:
      'UCyaN6mg5u8Cjy2ZI4ikWaug;UCF2v8v8te3_u4xhIQ8tGy1g;UC1LAjODfg7dnSSrrPGGPPMw;UCK-zlnUfoDHzUwXcbddtnkg;UCfRtwc6K_VU9N4OjNnU2P7g;UCfRtwc6K_VU9N4OjNnU2P7g;UC4bq21IPPbpu0Qrsl7LW0sw;UCcefcZRL2oaA_uBNeo5UOWg;UCGy7SkBjcIAgTiwkXEtPnYg;UCO8SO6KTCosQOvdLj68yyQQ;UC36zt_eM_gZQXayw_pAdASg;UCESLZhusAkFfsNsApnjF_Cg;UCdZxojNw026cW3RuA-B1f7w;UCfVPKWScEOPeHx63ws-E9nw;UCRCCrE1uX5Y05cmkXFiviWw;UCoOjH8D2XAgjzQlneM2W0EQ;UCkkhmBWfS7pILYIk0izkc3A;UCidsrMKtX7u_QJDsjAw-vKA;UCbVefFvKHAKAvuCCN0gmssg;UC0rQo28wJ0WU30W5athbrOA;UCznv7Vf9nBdJYvBagFdAHWw',
  },
   {

   title: 'crypto',
   youtubeChannels: 'UCbLhGKVY-bJPcawebgtNfbw;UCqK_GSMbpiV8spgD3ZGloSw;UCRvqjQPSeaWn-uEx-w0XOIg;UCI7M65p3A-D3P4v5qW8POxQ;UCu7Sre5A1NMV8J3s2FhluCw;UCofTOFX4QuhT8OY-3-fFRFw;UC188KLMYLLGqVJZdYq7mYFw;UCpceefaJ9vs4RYUTsO9Y3FA;UC4xKdmAXFh4ACyhpiQ_3qBw;UCZ3fejCy_P5xhv9QF-V6-YA;UCbkjUYiPN8P48r0lurEBP8w;UCjemQfjaXAzA-95RKoy9n_g;UCCatR7nWbYrkVXdxXb4cGXw;UCoJhK5kMc4LjBKdiYrDtzlA;UCBH5VZE_Y4F3CMcPIzPEB5A;UCrYmtJBtLdtm2ov84ulV-yg;UCJWCJCWOxBYSi5DhCieLOLQ;UCRvqjQPSeaWn-uEx-w0XOIg;UCevXpeL8cNyAnww-NqJ4m2w;UCMtJYS0PrtiUwlk6zjGDEMA;UCxODjeUwZHk3p-7TU-IsDOA;UCGyqEtcGQQtXyUwvcy7Gmyg;UCJgHxpqfhWEEjYH9cLXqhIQ;UCl2oCaw8hdR_kbqyqd2klIA;UCiUnrCUGCJTCC7KjuW493Ww;UC-5HLi3buMzdxjdTdic3Aig;UCQNHKsYDGlWefzv9MAaOJGA;UCi7RBPfTtRkVchV6qO8PUzg;UCq41LOyktVBW_CaVi2WKKXw;UClgJyzwGs-GyaNxUHcLZrkg;UC23Tb0Q1b0Vd3-m5As6N59Q;UCeBbEvlSOeJMwSVYOdXOvvw',

 },
   {
   title: 'Leisure',
    youtubeChannels:
      'UCbpMy0Fg74eXXkvxJrtEn3w;UCUnFheTbVpASikm0YPb8pSw;UCHmdRuKUSB7xrbv8uC0TKxg;UCxr2d4As312LulcajAkKJYw;UC1GO0P2HsI0XLiMalC5_wQw;UCQBG3PzyQKY8ieMG2gDAyOQ;UChBSJmgtiMGG1IUUuzj9Acw;UCARXOI1UlItgIevoI5jZViQ;UCVGVbOl6F5rGF4wSYS6Y5yQ;UCcjhYlL1WRBjKaJsMH_h7Lg;UCJHA_jMfCvEnv-3kRjTCQXw;UCPzFLpOblZEaIx2lpym1l1A;UCuL-5ytBmu6KG0BwjSFaD0g;UC_oqZXtcxfJTaw1j2M1H1XQ;UCDq5v10l4wkV5-ZBIJJFbzQ;UCzH5n3Ih5kgQoiDAQt2FwLw;UCsdD3quGf01RWABJt8wLe9g;UChBEbMKI1eCcejTtmI32UEw;UCwZcpfUOuLH9UEXvFPHIAWQ;UCRzPUBhXUZHclB7B5bURFXw;UCoMum0pwewO8_WtTlUQxGHw;UCekQr9znsk2vWxBo3YiLq2w;UCIEv3lZ_tNXHzL3ox-_uUGQ;UCpSgg_ECBj25s9moCDfSTsA;UCffs63OaN2nh-6StR6hzfiQ;UCj0V0aG4LcdHmdPJ7aTtSCQ;UCGs1JjiRBEKMlVD4eUxJ2ww;UCj7YznKvjMpXAXuzs9wWvtg;UC2N2HqEyaVE5Tt1rFqe3_Og;UCpnuadQ_w3r6f4Q_NRlqd-w;UC6am0tFqAQVqYwF2YV31zZQ;UC_uIW_MvxONcZsAkaMq1ujA;UCa1WbVCkTqd5ecG6G2adIow;UCpbClyFMuJQJJH7skfiVeQg;UCH81s83yNAl2YiH48DjxJpg;UC54bvNhGfYlw38iW5KCjJAA;UCDRqoPBHJ7oFcxqvyPBAg6A;UCBVEq4QRqxb6yPO5OpJJ1XQ;UCyEd6QBSgat5kkC6svyjudA;UCp2dhjQXkhY1O40lj15JQzw;UCDTINI9skkeZNY2ZXnBqIkQ;UC4ijq8Cg-8zQKx8OH12dUSw;UC0Ize0RLIbGdH5x4wI45G-A;UCwO9naEwEdTuT9Q5Vze6XCA;UCey7V2zwnjaxPKhfJ0sYE4g;UC_tXKhJlqZrgr_qdhEKmrDQ;UClnm4LP43k7AkjhdwKrOONA;UCUmVotIMVDOHNetxVKxs2Tg;UCxDZs_ltFFvn0FDHT6kmoXA;UCXulruMI7BHj3kGyosNa0jA;UCgZM50Ig7STDS0l6f_QnrXw;UCDsElQQt_gCZ9LgnW-7v-cQ;UCw3LUhWr0j-z2rpqGfQK8Tg;UC8EQAfueDGNeqb1ALm0LjHA;UCXvzpK4eKUJysEZ42zjTUdw;UCdMHDOiMLVGlntDX-4I_-rg;UC0k238zFx-Z8xFH0sxCrPJg;UCq6H4g9eVY9WxoboCFd0iRA;UC6-X3epFE06GDWRHLQG_YMA;UCY04Nk2nZkUkT4hqf_7suZA;UCHNK-JM63_vb2CJc1wC4p8g;UC6kpDTAXXNV5SEP5g1HoPTA;UCulFhrW_YCwkq_BP16C82mA;UC_zQ777U6YTyatP3P1wi3xw;UCNZ3t1dMKJGl6-kV9BD5Lqg;UCdvcXJuHTUkJ_uvu8Qw7U2A;UCFuyCsMOEkJ27lHZ-AT9TmA;UCIxAaCJ84uefATKmazDyIjw;UCCkFJmUgzrZdkeHl_qPItsA;UC39z4_U8Kls0llAij3RRZAQ;UCHYSw4XKO_q1GaChw5pxa-w',
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

];

if (typeof document === 'undefined') {
  module.exports = {
    channels,
  };
}
