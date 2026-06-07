// TamilBlasters Provider — fixed for Nuvio Hermes sandbox
// Languages: Tamil, Malayalam, Telugu, Hindi
// Type: Magnet links (WEB-DL)

var TB_DOMAINS = [
  "https://www.tamilblasters.quest",
  "https://www.tamilblasters.party",
  "https://www.tamilblasters.life",
  "https://www.tamilblasters.co"
];
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
  if (domains.length === 0) return Promise.reject(new Error("All TamilBlasters domains failed"));
  return fetch(domains[0] + "/?s=" + encodeURIComponent(query), {
    headers: { "User-Agent": UA, "Referer": domains[0] }
  })
    .then(function (r) {
      return r.text().then(function (html) {
        if (html.indexOf("class=\"post") === -1 && html.indexOf("hentry") === -1) {
          throw new Error("No results");
        }
        return { html: html, base: domains[0] };
      });
    })
    .catch(function () { return trySearch(domains.slice(1), query); });
}

function findPostLinks(html, base, year) {
  var links = [];
  var re = /href="(https?:\/\/[^"]+tamilblasters[^"]+\/[a-z0-9-]+\/?)"/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var href = m[1];
    if (href.indexOf("/category/") !== -1 || href.indexOf("/page/") !== -1 || href === base + "/") continue;
    var dup = false;
    for (var i = 0; i < links.length; i++) { if (links[i] === href) { dup = true; break; } }
    if (!dup) {
      if (year && href.indexOf(year) !== -1) links.unshift(href);
      else links.push(href);
    }
  }
  return links.slice(0, 4);
}

function extractMagnets(postUrl) {
  return fetch(postUrl, { headers: { "User-Agent": UA, "Referer": postUrl } })
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
        var ctx = html.substring(Math.max(0, pos - 400), pos + 50);

        var q = "HD";
        if (/4k|2160p|uhd/i.test(ctx)) q = "4K";
        else if (/1080p/i.test(ctx)) q = "1080p";
        else if (/720p/i.test(ctx)) q = "720p";
        else if (/480p/i.test(ctx)) q = "480p";

        var lang = "";
        if (/malayalam/i.test(ctx)) lang = "Mal";
        else if (/tamil/i.test(ctx)) lang = "Tam";
        else if (/telugu/i.test(ctx)) lang = "Tel";

        var parts = [q];
        if (lang) parts.push(lang);
        if (/true web-dl|web-dl/i.test(ctx)) parts.push("WEB-DL");
        var sz = ctx.match(/([\d.]+)\s*GB/i);
        if (sz) parts.push(sz[1] + "GB");
        if (/esub/i.test(ctx)) parts.push("ESub");
        parts.push("TamilBlasters");

        streams.push({ name: "🔥 TamilBlasters", title: parts.join(" | "), infoHash: ih, quality: q });
      }
      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== "movie") return Promise.resolve([]);

  return getTitleFromTMDB(tmdbId)
    .then(function (meta) {
      return trySearch(TB_DOMAINS, meta.origTitle)
        .then(function (res) {
          var links = findPostLinks(res.html, res.base, meta.year);
          if (links.length === 0 && meta.origTitle !== meta.title) {
            return trySearch(TB_DOMAINS, meta.title).then(function (r2) { return findPostLinks(r2.html, r2.base, meta.year); });
          }
          return links;
        })
        .then(function (links) {
          if (links.length === 0) return [];
          return extractMagnets(links[0]);
        });
    })
    .catch(function (e) {
      console.error("[TamilBlasters] Error:", e.message);
      return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}  var links = [];
  // WordPress search result post links
  var patterns = [
    /class="post-title[^"]*"[^>]*>\s*<a\s+href="([^"]+)"/gi,
    /class="entry-title[^"]*"[^>]*>\s*<a\s+href="([^"]+)"/gi,
    /class="[^"]*title[^"]*"[^>]*>\s*<a\s+href="([^"]+)"/gi,
    // Generic: any link containing the title slug
    new RegExp('href="(' + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\"]+)\"", "gi")
  ];

  var titleSlug = title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

  patterns.forEach(function (re) {
    var m;
    while ((m = re.exec(html)) !== null) {
      var href = m[1];
      if (href.indexOf(base) === 0 &&
          href !== base + "/" &&
          href.indexOf("/category/") === -1 &&
          href.indexOf("/page/") === -1 &&
          links.indexOf(href) === -1) {
        // Check URL contains title or year
        var hrefLower = href.toLowerCase();
        if (hrefLower.indexOf(titleSlug.substring(0, 6)) !== -1 ||
            (year && hrefLower.indexOf(year) !== -1)) {
          links.unshift(href);
        } else {
          links.push(href);
        }
      }
    }
  });

  return links.slice(0, 4);
}

function extractTBStreams(postUrl) {
  return fetch(postUrl, { headers: HEADERS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];

      // Magnet links
      var magnetRe = /(magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*)/gi;
      var m;
      while ((m = magnetRe.exec(html)) !== null) {
        var magnet = m[1];
        var ihMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
        if (!ihMatch) continue;

        var infoHash = ihMatch[1].toLowerCase();
        var pos = html.indexOf(magnet);
        var ctx = html.substring(Math.max(0, pos - 400), pos + 100);

        var quality = "HD";
        if (/4k|2160p|uhd/i.test(ctx)) quality = "4K";
        else if (/1080p/i.test(ctx)) quality = "1080p";
        else if (/720p/i.test(ctx)) quality = "720p";
        else if (/480p/i.test(ctx)) quality = "480p";

        var isWEBDL = /true web-dl|web-dl|webrip/i.test(ctx);
        var hasESub = /esub/i.test(ctx);
        var sizeMatch = ctx.match(/([\d.]+)\s*GB/i);
        var size = sizeMatch ? sizeMatch[1] + " GB" : "";

        // Detect language from context
        var langTag = "";
        if (/malayalam/i.test(ctx)) langTag = "Mal";
        else if (/tamil/i.test(ctx)) langTag = "Tam";
        else if (/telugu/i.test(ctx)) langTag = "Tel";
        else if (/hindi/i.test(ctx)) langTag = "Hin";

        var parts = [quality];
        if (langTag) parts.push(langTag);
        if (isWEBDL) parts.push("WEB-DL");
        if (size) parts.push(size);
        if (hasESub) parts.push("ESub");
        parts.push("TamilBlasters");

        streams.push({
          name: "🔥 TamilBlasters",
          title: parts.join(" | "),
          infoHash: infoHash,
          quality: quality
        });
      }

      // Also check for direct torrent file links
      var torrentRe = /href="(https?:\/\/[^"]+\.torrent[^"]*)"/gi;
      while ((m = torrentRe.exec(html)) !== null) {
        streams.push({
          name: "🔥 TamilBlasters",
          title: "Torrent | TamilBlasters",
          url: m[1],
          quality: "HD"
        });
      }

      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== "movie") return Promise.resolve([]);

  return fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?language=en-US", {
    headers: { "Authorization": "Bearer " + (typeof TMDB_TOKEN !== "undefined" ? TMDB_TOKEN : "") }
  })
    .then(function (r) { return r.json(); })
    .then(function (meta) {
      var title = meta.title || "";
      var origTitle = meta.original_title || title;
      var year = (meta.release_date || "").split("-")[0];

      // Try original title first (better for Malayalam/Tamil films)
      var query = origTitle !== title ? origTitle : title;

      return trySearch(TB_DOMAINS, query)
        .then(function (res) {
          var links = findPostLinks(res.html, res.base, query, year);
          if (links.length === 0 && origTitle !== title) {
            // Retry with English title
            return trySearch(TB_DOMAINS, title)
              .then(function (res2) {
                return findPostLinks(res2.html, res2.base, title, year);
              })
              .catch(function () { return []; });
          }
          return links;
        })
        .then(function (links) {
          if (links.length === 0) return [];
          return extractTBStreams(links[0]);
        });
    })
    .catch(function (e) {
      console.error("[TamilBlasters] Error:", e.message);
      return [];
    });
}

module.exports = { getStreams };
