// this script checks if the Channels Ids are in a correct format
const { object, string, array } = require('yup');

const { channels } = require('../channels');

const validateYoutubeChannelIds = (channelIds) => {
  const schema = object().shape({
    channelIds: array()
      .transform(function (value, originalValue) {
        if (this.isType(value) && value !== null) {
          return value;
        }
        return originalValue ? originalValue.split(/[\s;]+/) : [];
      })
      .of(string().length(24).required()),
  });

  return schema.validateSync({ channelIds });
};

const errors = channels
  .map((channel) => {
    if (!channel.youtubeChannels) {
      return null;
    }
    try {
      validateYoutubeChannelIds(channel.youtubeChannels);
      return channel;
    } catch (error) {
      console.log(`The "${channel.title}" Walnut channel has an incorrect YouTube Channels Id(s):`);
      console.log({
        message: error.errors,
        params: error.params,
      });
      return error;
    }
  })
  .filter((c) => c instanceof Error);

if (errors.length > 0) {
  throw new Error('channels.js has error(s) ⛔️');
}

console.log('finished checking Channel Ids without errors ✅');
