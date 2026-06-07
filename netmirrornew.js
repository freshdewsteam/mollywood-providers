// NetMirrorNew Provider
// A newer/alternate endpoint for NetMirror with better server selection
// Falls back gracefully if unavailable
// Languages: Multi (English, Hindi, Tamil, Malayalam, Telugu)
// Type: M3U8 HLS streams, multi-server

var NMN_DOMAINS = [
  "https://vidsrc.xyz",
  "https://vidsrc.to",
  "https://vidsrc.pm"
];

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
  "Accept-Language": "en-US,en;q=0.9"
};

function tryDomains(domains, path) {
  if (domains.length === 0) return Promise.reject(new Error("All NetMirrorNew domains failed"));
  return fetch(domains[0] + path, { headers: HEADERS })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text().then(function (h) { return { html: h, base: domains[0] }; });
    })
    .catch(function () { return tryDomains(domains.slice(1), path); });
}

function extractStreams(html, base) {
  var streams = [];

  // M3U8 patterns
  var patterns = [
    /(https?:\/\/[^"'\s,]+\.m3u8[^"'\s,]*)/gi,
    /"file"\s*:\s*"(https?:\/\/[^"]+)"/gi,
    /source\s+src="(https?:\/\/[^"]+\.m3u8[^"]*)"/gi,
  ];

  patterns.forEach(function (re) {
    var m;
    while ((m = re.exec(html)) !== null) {
      var url = m[1];
      if (streams.findIndex(function (s) { return s.url === url; }) === -1) {
        streams.push({
          name: "🌐 NetMirrorNew",
          title: "Auto Quality | NetMirrorNew",
          url: url,
          quality: "auto"
        });
      }
    }
  });

  // Also check for iframes that need a second fetch
  var iframeRe = /src="(https?:\/\/[^"]+embed[^"]+)"/gi;
  var m;
  var iframes = [];
  while ((m = iframeRe.exec(html)) !== null) {
    iframes.push(m[1]);
  }

  if (streams.length > 0) return Promise.resolve(streams);

  // Follow first iframe
  if (iframes.length > 0) {
    return fetch(iframes[0], { headers: Object.assign({}, HEADERS, { Referer: base }) })
      .then(function (r) { return r.text(); })
      .then(function (iframeHtml) {
        return extractStreams(iframeHtml, iframes[0]);
      })
      .catch(function () { return []; });
  }

  return Promise.resolve([]);
}

function getStreams(tmdbId, mediaType, season, episode) {
  var path;
  if (mediaType === "movie") {
    path = "/embed/movie?tmdb=" + tmdbId;
  } else {
    path = "/embed/tv?tmdb=" + tmdbId + "&season=" + season + "&episode=" + episode;
  }

  return tryDomains(NMN_DOMAINS, path)
    .then(function (res) {
      return extractStreams(res.html, res.base);
    })
    .catch(function (e) {
      console.error("[NetMirrorNew] Error:", e.message);
      return [];
    });
}

module.exports = { getStreams };
