const https = require("https");
const vm = require("vm");

/**
 * Helper to make a GET request and return the body as a string.
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOpts = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        ...options.headers,
      },
    };

    https
      .get(url, reqOpts, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          // Handle redirects
          return resolve(fetch(res.headers.location, options));
        }
        if (res.statusCode !== 200) {
          return reject(
            new Error(`HTTP Error ${res.statusCode}: ${res.statusMessage}`)
          );
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

/**
 * Extracts the ytInitialPlayerResponse JSON from the HTML.
 */
function extractPlayerResponse(html) {
  // 1. Try standard variable assignment
  const match = html.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
  if (match) return JSON.parse(match[1]);

  // 2. Try window assignment
  const match2 = html.match(
    /window\["ytInitialPlayerResponse"\]\s*=\s*(\{.+?\});/
  );
  if (match2) return JSON.parse(match2[1]);

  throw new Error("Could not find ytInitialPlayerResponse in the page source.");
}

/**
 * Gets video metadata (Title, Author, Thumbnail) for the /info endpoint.
 */
async function getVideoInfo(videoUrl) {
  const html = await fetch(videoUrl);
  const playerResponse = extractPlayerResponse(html);

  if (
    playerResponse.playabilityStatus &&
    playerResponse.playabilityStatus.status === "ERROR"
  ) {
    throw new Error(`Video Error: ${playerResponse.playabilityStatus.reason}`);
  }

  const videoDetails = playerResponse.videoDetails;
  if (!videoDetails) throw new Error("Could not find videoDetails.");

  const thumbnails = videoDetails.thumbnail.thumbnails;
  const bestThumbnail = thumbnails[thumbnails.length - 1].url;

  return {
    title: videoDetails.title,
    thumbnail: bestThumbnail,
    author: videoDetails.author,
    channel: videoDetails.channelId,
  };
}

/**
 * Decipher code - extract the player script (base.js) and evaluate the
 * decryption function to unlock cipher signature streams.
 */
async function decipherUrl(html, cipherString) {
  // Parse cipher string into an object: url=...&s=...&sp=...
  const cipherParams = new URLSearchParams(cipherString);
  const url = cipherParams.get("url");
  const signature = cipherParams.get("s");
  const sp = cipherParams.get("sp") || "sig";

  if (!signature) {
    return url; // No signature to decrypt
  }

  // Find the base.js URL from HTML
  const matchScript = html.match(/(?:<script[^>]+src=")([^"]+base\.js)(?:")/);
  if (!matchScript)
    throw new Error("Could not find base.js player script in HTML.");

  let baseJsUrl = matchScript[1];
  if (baseJsUrl.startsWith("//")) baseJsUrl = "https:" + baseJsUrl;
  else if (baseJsUrl.startsWith("/"))
    baseJsUrl = "https://www.youtube.com" + baseJsUrl;

  const baseJs = await fetch(baseJsUrl);

  // Regex magic to find the main decipher function name
  // Matches something like: var a=a.split(""),b=... (often tied to standard sig decrypt signatures)
  const functionNameMatch =
    baseJs.match(
      /\b([a-zA-Z0-9$]+)&&\1\.set\([^,]+,encodeURIComponent\b([a-zA-Z0-9$]+)\(/
    ) ||
    baseJs.match(
      /(?:\b|[^a-zA-Z0-9$])([a-zA-Z0-9$]{2})\s*=\s*function\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)/
    ) ||
    baseJs.match(
      /([a-zA-Z0-9$]+)\s*=\s*function\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)/
    );

  let decipherFunctionName;
  if (functionNameMatch) {
    decipherFunctionName = functionNameMatch[1];
  }
  // Fallback regex (heuristic, looks for the function matching a signature mapping)
  if (!decipherFunctionName) {
    const altMatch = baseJs.match(
      /([a-zA-Z0-9$]+)\s*=\s*function\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\).+?return\s+a\.join\(\s*""\s*\)/
    );
    if (altMatch) decipherFunctionName = altMatch[1];
    else throw new Error("Could not find decipher function name in base.js");
  }

  // Now extract the decipher function body
  const escapeRegExp = (string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const funcBodyRegex = new RegExp(
    `${escapeRegExp(decipherFunctionName)}=function\\(a\\)\\{([\\s\\S]*?return a\\.join\\(""\\)\\})`
  );
  const decipherFuncMatch = baseJs.match(funcBodyRegex);

  if (!decipherFuncMatch)
    throw new Error("Could not find decipher function body.");
  const decipherFuncBody = decipherFuncMatch[0];

  // The decipher function usually relies on a helper object for swapping/reversing characters
  // Example: var a=a.split(""); AB.doSomething(a, 2); return a.join("");
  const helperObjectNameMatch = decipherFuncBody.match(
    /;([a-zA-Z0-9$]+)\.[a-zA-Z0-9$]+\(/
  );
  const helperObjectName = helperObjectNameMatch
    ? helperObjectNameMatch[1]
    : null;

  let helperObjectBody = "";
  if (helperObjectName) {
    // Extract the helper object: var AB={doSomething:function(a,b){...}, ...};
    const helperObjRegex = new RegExp(
      `var ${escapeRegExp(helperObjectName)}=\\{[\\s\\S]*?\\}\\};`
    );
    const helperMatch = baseJs.match(helperObjRegex);
    if (helperMatch) helperObjectBody = helperMatch[0];
  }

  // Execute the extracted JS code in a safe sandbox using vm
  const sandbox = {};
  const code = `
        ${helperObjectBody}
        var ${decipherFuncBody};
        var result = ${decipherFunctionName}('${signature}');
    `;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const decryptedSignature = sandbox.result;
  return `${url}&${sp}=${decryptedSignature}`;
}

/**
 * Gets the direct audio streaming URL.
 */
async function getAudioStreamUrl(videoUrl) {
  const html = await fetch(videoUrl);
  const playerResponse = extractPlayerResponse(html);

  if (
    playerResponse.playabilityStatus &&
    playerResponse.playabilityStatus.status === "ERROR"
  ) {
    throw new Error(`Video Error: ${playerResponse.playabilityStatus.reason}`);
  }

  const streamingData = playerResponse.streamingData;
  if (!streamingData)
    throw new Error("Could not find streamingData in player response.");

  // Look for both adaptive formats (audio-only) and formats (muxed video/audio)
  const formats = [
    ...(streamingData.adaptiveFormats || []),
    ...(streamingData.formats || []),
  ];

  // Filter for audio-only formats first, prioritize mp4 (AAC) or webm (Opus)
  const audioFormats = formats.filter(
    (f) => f.mimeType && f.mimeType.startsWith("audio/")
  );

  // Sort by audio quality (highest bitrate first)
  audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (audioFormats.length === 0) {
    throw new Error("No audio formats found for this video.");
  }

  const bestFormat = audioFormats[0];

  // The format might give us a direct URL, or it might be a cipher string we have to decrypt.
  let streamUrl;
  if (bestFormat.url) {
    streamUrl = bestFormat.url;
  } else if (bestFormat.signatureCipher || bestFormat.cipher) {
    const cipher = bestFormat.signatureCipher || bestFormat.cipher;
    streamUrl = await decipherUrl(html, cipher);
  } else {
    throw new Error("Could not find URL or cipher in the best audio format.");
  }

  return streamUrl;
}

module.exports = {
  getVideoInfo,
  getAudioStreamUrl,
};
