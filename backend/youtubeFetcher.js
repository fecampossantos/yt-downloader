const ytdl = require("@distube/ytdl-core");

/**
 * Gets video metadata (Title, Author, Thumbnail) for the /info endpoint.
 */
async function getVideoInfo(videoUrl) {
  try {
    const info = await ytdl.getInfo(videoUrl);
    const videoDetails = info.videoDetails;

    const thumbnails = videoDetails.thumbnails;
    const bestThumbnail = thumbnails[thumbnails.length - 1].url;

    return {
      title: videoDetails.title,
      thumbnail: bestThumbnail,
      author: videoDetails.author.name,
      channel: videoDetails.author.id,
    };
  } catch (err) {
    throw new Error(`Failed to fetch video info: ${err.message}`);
  }
}

/**
 * Gets a readable stream of the audio.
 */
function getAudioStream(videoUrl) {
  return ytdl(videoUrl, { filter: "audioonly", quality: "highestaudio" });
}

module.exports = {
  getVideoInfo,
  getAudioStream,
};
