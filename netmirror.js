// NetMirror Provider
// Source: net22.cc (domain rotates — check net22.cc for current)
// Languages: Multi (English, Hindi, Tamil, Malayalam, Telugu)
// Type: M3U8 / Direct streams
// Note: Disabled on iOS by default due to compatibility issues

var NETMIRROR_DOMAINS = [
  "https://net22.cc",
  "https://netmirror.app",
  "https://netm.cc"
];

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://net22.cc",
  "Referer": "https://net22.cc/"
};

function tryDomains(domains, path, opts) {
  if (domains.length === 0) return Promise.reject(new Error("All NetMirror domains failed"));
  var url = domains[0] + path;
  return fetch(url, opts || { headers: HEADERS })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text().then(function (h) { return { html: h, base: domains[0] }; });
    })
    .catch(function () { return tryDomains(domains.slice(1), path, opts); });
}

function getNetMirrorStreams(tmdbId, mediaType, season, episode) {
  // NetMirror has a direct TMDB-based embed API
  var path;
  if (mediaType === "movie") {
    path = "/embed/movie/" + tmdbId;
  } else {
    path = "/embed/tv/" + tmdbId + "/" + season + "/" + episode;
  }

  return tryDomains(NETMIRROR_DOMAINS, path)
    .then(function (res) {
      var html = res.html;
      var base = res.base;
      var streams = [];

      // Extract M3U8 stream URLs
      var m3u8Re = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi;
      var m;
      while ((m = m3u8Re.exec(html)) !== null) {
        streams.push({
          name: "🌐 NetMirror",
          title: "Auto Quality | NetMirror",
          url: m[1],
          quality: "auto"
        });
      }

      // Also look for JSON source config (common pattern in embed players)
      var jsonSrcRe = /"file"\s*:\s*"(https?:\/\/[^"]+)"/gi;
      while ((m = jsonSrcRe.exec(html)) !== null) {
        streams.push({
          name: "🌐 NetMirror",
          title: "Stream | NetMirror",
          url: m[1],
          quality: "HD"
        });
      }

      // source: [{file: "..."}]
      var srcArrRe = /file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi;
      while ((m = srcArrRe.exec(html)) !== null) {
        if (streams.findIndex(function (s) { return s.url === m[1]; }) === -1) {
          streams.push({
            name: "🌐 NetMirror",
            title: "HLS | NetMirror",
            url: m[1],
            quality: "auto"
          });
        }
      }

      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return getNetMirrorStreams(tmdbId, mediaType, season, episode)
    .catch(function (e) {
      console.error("[NetMirror] Error:", e.message);
      return [];
    });
}

module.exports = { getStreams };
