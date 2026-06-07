// DVDPlay Provider — fixed for Nuvio Hermes sandbox
// Languages: Malayalam, Tamil, Hindi
// Type: Direct MKV via HubCloud

var DOMAINS = ["https://dvdplay.com.co", "https://dvdplay.show", "https://dvdplay.art"];
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
var TMDB_KEY = "1b0e359e5d9d1be39b2de291c35d5426";

function getTitleFromTMDB(tmdbId) {
  return fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=" + TMDB_KEY, {
    headers: { "User-Agent": UA }
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      return {
        title: d.title || "",
        origTitle: d.original_title || d.title || "",
        year: (d.release_date || "").split("-")[0]
      };
    });
}

function trySearch(domains, query) {
  if (domains.length === 0) return Promise.reject(new Error("All DVDPlay domains failed"));
  return fetch(domains[0] + "/?s=" + encodeURIComponent(query), {
    headers: { "User-Agent": UA, "Referer": domains[0] }
  })
    .then(function (r) { return r.text().then(function (h) { return { html: h, base: domains[0] }; }); })
    .catch(function () { return trySearch(domains.slice(1), query); });
}

function findLinks(html, base, year) {
  var links = [];
  var re = /href="(https?:\/\/[^"]*dvdplay[^"]*\/(?!category|page|tag)[a-z0-9-]+\/?)"/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var href = m[1];
    var dup = false;
    for (var i = 0; i < links.length; i++) { if (links[i] === href) { dup = true; break; } }
    if (!dup && href !== base + "/") links.push(href);
  }
  if (year) {
    var filtered = links.filter(function (l) { return l.indexOf(year) !== -1; });
    if (filtered.length > 0) return filtered.slice(0, 3);
  }
  return links.slice(0, 3);
}

function extractStreams(postUrl) {
  return fetch(postUrl, { headers: { "User-Agent": UA, "Referer": postUrl } })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];
      var quals = html.match(/(4K|2160p|1080p|720p|480p)/gi) || ["HD"];

      // HubCloud links
      var re = /href="(https?:\/\/hubcloud\.[a-z]+\/[^"]+)"/gi;
      var m;
      var idx = 0;
      while ((m = re.exec(html)) !== null && idx < 5) {
        streams.push({ name: "📀 DVDPlay", title: (quals[idx] || "HD") + " | DVDPlay", url: m[1], quality: quals[idx] || "HD" });
        idx++;
      }
      // Direct MKV/MP4
      var re2 = /href="(https?:\/\/[^"]+\.(mkv|mp4)[^"]*)"/gi;
      while ((m = re2.exec(html)) !== null) {
        streams.push({ name: "📀 DVDPlay", title: (quals[0] || "HD") + " | DVDPlay Direct", url: m[1], quality: quals[0] || "HD" });
      }
      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== "movie") return Promise.resolve([]);

  return getTitleFromTMDB(tmdbId)
    .then(function (meta) {
      return trySearch(DOMAINS, meta.origTitle)
        .then(function (res) {
          var links = findLinks(res.html, res.base, meta.year);
          if (links.length === 0 && meta.origTitle !== meta.title) {
            return trySearch(DOMAINS, meta.title).then(function (r2) { return findLinks(r2.html, r2.base, meta.year); });
          }
          return links;
        })
        .then(function (links) {
          if (links.length === 0) return [];
          return extractStreams(links[0]);
        });
    })
    .catch(function (e) {
      console.error("[DVDPlay] Error:", e.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
