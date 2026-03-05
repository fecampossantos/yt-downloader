const youtubedl = require("youtube-dl-exec");

/**
 * Gets video metadata (Title, Author, Thumbnail) for the /info endpoint.
 */
async function getVideoInfo(videoUrl) {
  try {
    const info = await youtubedl(videoUrl, {
      dumpJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });

    return {
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.channel || info.uploader,
      channel: info.channel_id || info.uploader_id,
    };
  } catch (err) {
    throw new Error(`Failed to fetch video info: ${err.message}`);
  }
}

/**
 * Gets a readable stream of the audio.
 */
async function getAudioStream(videoUrl) {
  const subprocess = youtubedl.exec(videoUrl, {
    output: "-",
    format: "bestaudio",
    noWarnings: true,
    noCallHome: true,
    noCheckCertificate: true,
  });
  return subprocess.stdout;
}

module.exports = {
  getVideoInfo,
  getAudioStream,
};
