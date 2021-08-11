// this script checks if the Channels Ids are in a correct format

const { channels } = require('../channels');

const errors = channels
  .map((channel) => {
    if (channel.youtubeChannels) {
      const channelIds = channel.youtubeChannels.split(';');
      const cc = channelIds
        .map((channelId) => {
          if (channelId.length !== 24) {
            return new Error();
          }
          return channelId;
        })
        .filter((c) => c instanceof Error);
      if (cc.length > 0) {
        const error = new Error(
          `The "${channel.title}" Walnut channel has an incorrect YouTube Channels Id(s):\n${channelIds}\n\n`
        );
        console.log(error.message);
        return error;
      }
    }
    return channel;
  })
  .filter((c) => c instanceof Error);

if (errors.length > 0) {
  throw new Error('channels.js has error(s) ⛔️');
}

console.log('finished checking Channel Ids without errors ✅');
