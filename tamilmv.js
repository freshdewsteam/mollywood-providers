// TamilMV Provider
// Source: 1tamilmv.cards (domain rotates — uses tamilmv.fi as redirect hub)
// Languages: Tamil, Malayalam, Telugu, Hindi
// Type: Magnet links / Torrent (WEB-DL, TRUE WEB-DL, 4K)
// Note: Heavily Cloudflare protected. This provider uses a lightweight
//       search approach targeting the topic URL slug which contains the title,
//       avoiding JS-rendered pages where possible.

var TAMILMV_DOMAINS = [
  "https://www.1tamilmv.cards",
  "https://www.1tamilmv.fi",
  "https://www.1tamilmv.ws"
];

// Malayalam forum: /index.php?/forums/forum/34-malayalam-language/
// Tamil forum:     /index.php?/forums/forum/9-tamil-language/
var MALAYALAM_FORUM = "/index.php?/forums/forum/34-malayalam-language/";
var TAMIL_FORUM = "/index.php?/forums/forum/9-tamil-language/";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function tryDomains(domains, path) {
  if (domains.length === 0) return Promise.reject(new Error("All TamilMV domains failed / Cloudflare blocked"));
  return fetch(domains[0] + path, { headers: HEADERS })
    .then(function (r) {
      // If Cloudflare intercepts, we get the homepage (not the topic)
      // Detect redirect to homepage
      if (r.url && r.url.indexOf("forums/topic") === -1 && r.url.indexOf("forums/forum") === -1 && path.indexOf("forums") !== -1) {
        throw new Error("Cloudflare redirect detected");
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text().then(function (h) { return { html: h, base: domains[0] }; });
    })
    .catch(function () { return tryDomains(domains.slice(1), path); });
}

function searchTopics(base, forumPath, title, year) {
  // Search the forum page for topic links matching the title
  return fetch(base + forumPath, { headers: HEADERS })
    .then(function (r) {
      // Check if Cloudflare blocked us (homepage returned)
      return r.text().then(function (html) {
        if (html.indexOf("forums/topic") === -1) {
          throw new Error("Cloudflare blocked forum listing");
        }
        return html;
      });
    })
    .then(function (html) {
      // Extract all topic links
      var topicRe = /href="(https?:\/\/[^"]+\/forums\/topic\/[^"]+)"/gi;
      var m;
      var topics = [];
      var titleSlug = slugify(title);
      var yearStr = year ? year.toString() : "";

      while ((m = topicRe.exec(html)) !== null) {
        var href = m[1];
        var hrefLower = href.toLowerCase();
        // Match by title slug in URL
        if (titleSlug && hrefLower.indexOf(titleSlug) !== -1) {
          if (yearStr && hrefLower.indexOf(yearStr) !== -1) {
            topics.unshift(href); // prioritise year match
          } else {
            topics.push(href);
          }
        }
      }
      return topics.slice(0, 3);
    });
}

function extractMagnets(topicUrl) {
  return fetch(topicUrl, { headers: HEADERS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];

      // Extract magnet links
      var magnetRe = /(magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*)/gi;
      var m;
      while ((m = magnetRe.exec(html)) !== null) {
        var magnet = m[1];
        // Extract infoHash
        var ihMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
        if (!ihMatch) continue;
        var infoHash = ihMatch[1].toLowerCase();

        // Get quality context
        var pos = html.indexOf(magnet);
        var ctx = pos > 300 ? html.substring(pos - 300, pos) : html.substring(0, pos);
        var quality = "HD";
        if (/4k|2160p|uhd/i.test(ctx)) quality = "4K";
        else if (/1080p/i.test(ctx)) quality = "1080p";
        else if (/720p/i.test(ctx)) quality = "720p";
        else if (/480p/i.test(ctx)) quality = "480p";

        var isWEBDL = /true web-dl|web-dl/i.test(ctx);
        var hasESub = /esub/i.test(ctx);
        var sizeMatch = ctx.match(/([\d.]+)\s*GB/i);
        var size = sizeMatch ? sizeMatch[1] + " GB" : "";

        var titleParts = [quality];
        if (isWEBDL) titleParts.push("WEB-DL");
        if (size) titleParts.push(size);
        if (hasESub) titleParts.push("ESub");
        titleParts.push("TamilMV");

        streams.push({
          name: "🎭 TamilMV",
          title: titleParts.join(" | "),
          infoHash: infoHash,
          quality: quality
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
      var lang = meta.original_language || "";

      // Pick forum based on language
      var forumPath = (lang === "ml") ? MALAYALAM_FORUM : TAMIL_FORUM;

      // Try all domains
      var allFailed = true;
      var searchPromises = TAMILMV_DOMAINS.map(function (domain) {
        return searchTopics(domain, forumPath, origTitle, year)
          .then(function (topics) {
            if (topics.length > 0) { allFailed = false; }
            return topics;
          })
          .catch(function () { return []; });
      });

      return Promise.all(searchPromises)
        .then(function (results) {
          var topics = results.reduce(function (acc, r) { return acc.concat(r); }, []);
          // Deduplicate
          var seen = {};
          topics = topics.filter(function (t) {
            if (seen[t]) return false;
            seen[t] = true;
            return true;
          });
          if (topics.length === 0) return [];
          return extractMagnets(topics[0]);
        });
    })
    .catch(function (e) {
      console.error("[TamilMV] Error:", e.message);
      return [];
    });
}

module.exports = { getStreams };
