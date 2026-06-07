// TamilMV Provider — fixed for Nuvio Hermes sandbox
// Languages: Tamil, Malayalam, Telugu
// Type: TRUE WEB-DL / 4K magnet links
// Note: Cloudflare protected — may return empty on blocked ISPs

var MV_DOMAINS = [
  "https://www.1tamilmv.cards",
  "https://www.1tamilmv.ws",
  "https://www.1tamilmv.fi"
];
var MAL_FORUM = "/index.php?/forums/forum/34-malayalam-language/";
var TAM_FORUM = "/index.php?/forums/forum/9-tamil-language/";
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
        year: (d.release_date || "").split("-")[0],
        lang: d.original_language || ""
      };
    });
}

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

function tryForum(domains, forumPath, slug, year) {
  if (domains.length === 0) return Promise.resolve([]);
  return fetch(domains[0] + forumPath, { headers: { "User-Agent": UA, "Referer": domains[0] } })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      // If Cloudflare intercepts, we get homepage content (no forum topics)
      if (html.indexOf("forums/topic") === -1) return tryForum(domains.slice(1), forumPath, slug, year);

      var topics = [];
      var re = /href="(https?:\/\/[^"]+\/forums\/topic\/[^"]+)"/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        var href = m[1];
        var hl = href.toLowerCase();
        if (slug && hl.indexOf(slug) !== -1) {
          if (year && hl.indexOf(year) !== -1) topics.unshift(href);
          else topics.push(href);
        }
      }
      return topics.slice(0, 3);
    })
    .catch(function () { return tryForum(domains.slice(1), forumPath, slug, year); });
}

function extractMagnets(topicUrl) {
  return fetch(topicUrl, { headers: { "User-Agent": UA, "Referer": topicUrl } })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];
      var re = /(magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*)/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        var magnet = m[1];
        var ihMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
        if (!ihMatch) continue;
        var ih = ihMatch[1].toLowerCase();
        var pos = html.indexOf(magnet);
        var ctx = html.substring(Math.max(0, pos - 300), pos + 50);

        var q = "HD";
        if (/4k|2160p|uhd/i.test(ctx)) q = "4K";
        else if (/1080p/i.test(ctx)) q = "1080p";
        else if (/720p/i.test(ctx)) q = "720p";
        else if (/480p/i.test(ctx)) q = "480p";

        var parts = [q];
        if (/true web-dl/i.test(ctx)) parts.push("TRUE WEB-DL");
        else if (/web-dl/i.test(ctx)) parts.push("WEB-DL");
        var sz = ctx.match(/([\d.]+)\s*GB/i);
        if (sz) parts.push(sz[1] + "GB");
        if (/esub/i.test(ctx)) parts.push("ESub");
        parts.push("TamilMV");

        streams.push({ name: "🎭 TamilMV", title: parts.join(" | "), infoHash: ih, quality: q });
      }
      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== "movie") return Promise.resolve([]);

  return getTitleFromTMDB(tmdbId)
    .then(function (meta) {
      var slug = slugify(meta.origTitle || meta.title);
      var forumPath = meta.lang === "ml" ? MAL_FORUM : TAM_FORUM;

      return tryForum(MV_DOMAINS, forumPath, slug, meta.year)
        .then(function (topics) {
          if (topics.length === 0) return [];
          return extractMagnets(topics[0]);
        });
    })
    .catch(function (e) {
      console.error("[TamilMV] Error:", e.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
          }
