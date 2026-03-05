const { getVideoInfo } = require("./youtubeFetcher");

async function run() {
  const url = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"; // Big Buck Bunny
  try {
    const info = await getVideoInfo(url);
    console.log(info);
  } catch (err) {
    console.error(err);
  }
}
run();
