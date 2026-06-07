// NetMirrorNew Provider — fixed for Nuvio Hermes sandbox
// Uses VidSrc embed with TMDB ID directly — no title search needed
// Languages: Multi including Tamil, Malayalam, Hindi, English

var DOMAINS = [
  "https://vidsrc.xyz",
  "https://vidsrc.to",
  "https://vidsrc.pm",
  "https://vidsrc.net"
];

var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

function tryDomains(domains, path) {
  if (domains.length === 0) return Promise.reject(new Error("[NetMirrorNew] All domains failed"));
  var domain = domains[0];
  return fetch(domain + path, {
    headers: { "User-Agent": UA, "Referer": domain, "Accept": "*/*" }
  })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text().then(function (h) { return { html: h, base: domain }; });
    })
    .catch(function () { return tryDomains(domains.slice(1), path); });
}

function extractStreams(html, base, label) {
  var streams = [];
  var patterns = [
    /(https?:\/\/[^"'\s]+\.m3u8[^"'\s,]*)/g,
    /"file"\s*:\s*"(https?:\/\/[^"]+)"/g,
    /src\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/g
  ];
  patterns.forEach(function (re) {
    var m;
    while ((m = re.exec(html)) !== null) {
      var url = m[1];
      var dup = false;
      for (var i = 0; i < streams.length; i++) {
        if (streams[i].url === url) { dup = true; break; }
      }
      if (!dup) {
        streams.push({
          name: "🌐 " + (label || "NetMirrorNew"),
          title: "Auto | " + (label || "NetMirrorNew"),
          url: url,
          quality: "auto"
        });
      }
    }
  });
  return streams;
}

function getStreams(tmdbId, mediaType, season, episode) {
  var path = mediaType === "movie"
    ? "/embed/movie?tmdb=" + tmdbId
    : "/embed/tv?tmdb=" + tmdbId + "&season=" + season + "&episode=" + episode;

  return tryDomains(DOMAINS, path)
    .then(function (res) {
      var streams = extractStreams(res.html, res.base, "NetMirrorNew");
      if (streams.length > 0) return streams;
      // Follow iframe
      var iframeMatch = res.html.match(/src=["'](https?:\/\/[^"']+)["']/);
      if (iframeMatch) {
        return fetch(iframeMatch[1], { headers: { "User-Agent": UA, "Referer": res.base } })
          .then(function (r) { return r.text(); })
          .then(function (h) { return extractStreams(h, iframeMatch[1], "NetMirrorNew"); })
          .catch(function () { return []; });
      }
      return [];
    })
    .catch(function (e) {
      console.error("[NetMirrorNew] Error:", e.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
