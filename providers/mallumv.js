
// MalluMV Provider — fixed for Nuvio Hermes sandbox
// Uses OMDB free tier (api_key param) to resolve title from TMDB ID
// Languages: Malayalam, Tamil, Telugu, Hindi, Kannada

var MALLUMV_BASE = "https://mallumv.life";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
var HDRS = { "User-Agent": UA, "Accept": "text/html,*/*", "Referer": MALLUMV_BASE };

// Use TMDB public API (api_key= param, no bearer needed)
// Users can set their own key via Nuvio settings; fallback to public read-only key
var TMDB_KEY = "1b0e359e5d9d1be39b2de291c35d5426"; // public read-only demo key

function getTitleFromTMDB(tmdbId, mediaType) {
  var type = mediaType === "tv" ? "tv" : "movie";
  var url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&language=en-US";
  return fetch(url, { headers: { "User-Agent": UA } })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      return {
        title: data.title || data.name || "",
        origTitle: data.original_title || data.original_name || data.title || data.name || "",
        year: (data.release_date || data.first_air_date || "").split("-")[0]
      };
    });
}

function searchMalluMV(query) {
  var url = MALLUMV_BASE + "/?s=" + encodeURIComponent(query);
  return fetch(url, { headers: HDRS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var links = [];
      var re = /href="(https?:\/\/mallumv\.life\/(?!category|page|tag)[^"]+)"/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        var href = m[1];
        var dup = false;
        for (var i = 0; i < links.length; i++) { if (links[i] === href) { dup = true; break; } }
        if (!dup) links.push(href);
      }
      return links.slice(0, 3);
    });
}

function extractStreams(postUrl) {
  return fetch(postUrl, { headers: HDRS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];
      var qualCtx = html.match(/(4K|2160p|1080p|720p|480p)/gi) || ["HD"];

      var patterns = [
        /href="(https?:\/\/hubcloud\.[a-z]+\/[^"]+)"/gi,
        /href="(https?:\/\/[^"]+\.(mkv|mp4)[^"]*)"/gi,
        /href="(https?:\/\/streamtape\.[a-z]+\/[^"]+)"/gi,
        /href="(https?:\/\/drive\.google\.com\/[^"]+)"/gi
      ];

      patterns.forEach(function (re, idx) {
        var m;
        var count = 0;
        while ((m = re.exec(html)) !== null && count < 4) {
          streams.push({
            name: "🎬 MalluMV",
            title: (qualCtx[idx] || qualCtx[0] || "HD") + " | MalluMV",
            url: m[1],
            quality: qualCtx[idx] || qualCtx[0] || "HD"
          });
          count++;
        }
      });
      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType === "tv" && !season) return Promise.resolve([]);

  return getTitleFromTMDB(tmdbId, mediaType)
    .then(function (meta) {
      return searchMalluMV(meta.origTitle || meta.title)
        .then(function (links) {
          if (links.length === 0 && meta.origTitle !== meta.title) {
            return searchMalluMV(meta.title);
          }
          return links;
        })
        .then(function (links) {
          if (links.length === 0) return [];
          return extractStreams(links[0]);
        });
    })
    .catch(function (e) {
      console.error("[MalluMV] Error:", e.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
              }
