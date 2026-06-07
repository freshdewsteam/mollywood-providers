// NetMirror Provider — fixed for Nuvio Hermes sandbox
// Uses TMDB ID directly — no title search, no TMDB API call needed
// Languages: Multi including Tamil, Malayalam, Hindi

var DOMAINS = [
  "https://net22.cc",
  "https://netmirror.app",
  "https://netm.cc"
];

var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

function tryDomains(domains, path) {
  if (domains.length === 0) {
    return Promise.reject(new Error("[NetMirror] All domains failed"));
  }
  var domain = domains[0];
  var remaining = domains.slice(1);
  return fetch(domain + path, {
    headers: { "User-Agent": UA, "Referer": domain }
  })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    })
    .then(function (html) {
      return { html: html, base: domain };
    })
    .catch(function () {
      return tryDomains(remaining, path);
    });
}

function extractM3U8(html) {
  var streams = [];
  var patterns = [
    /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g,
    /"file"\s*:\s*"(https?:\/\/[^"]+)"/g,
    /source\s+src=["'](https?:\/\/[^"']+\.m3u8[^"']*)/g
  ];
  patterns.forEach(function (re) {
    var m;
    while ((m = re.exec(html)) !== null) {
      var url = m[1];
      var exists = false;
      for (var i = 0; i < streams.length; i++) {
        if (streams[i].url === url) { exists = true; break; }
      }
      if (!exists) {
        streams.push({ name: "🌐 NetMirror", title: "Auto | NetMirror", url: url, quality: "auto" });
      }
    }
  });
  return streams;
}

function getStreams(tmdbId, mediaType, season, episode) {
  var path = mediaType === "movie"
    ? "/embed/movie/" + tmdbId
    : "/embed/tv/" + tmdbId + "/" + season + "/" + episode;

  return tryDomains(DOMAINS, path)
    .then(function (res) {
      var streams = extractM3U8(res.html);
      // Follow first iframe if no direct streams
      if (streams.length === 0) {
        var iframeMatch = res.html.match(/src=["'](https?:\/\/[^"']+embed[^"']+)["']/);
        if (iframeMatch) {
          return fetch(iframeMatch[1], { headers: { "User-Agent": UA, "Referer": res.base } })
            .then(function (r) { return r.text(); })
            .then(function (h) { return extractM3U8(h); })
            .catch(function () { return []; });
        }
      }
      return streams;
    })
    .catch(function (e) {
      console.error("[NetMirror] Error:", e.message);
      return [];
    });
}

// Required for Nuvio Hermes sandbox
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
                    }
