// MalluMV Provider
// Source: mallumv.life
// Languages: Malayalam, Tamil, Telugu, Hindi, Kannada
// Type: Direct download links (MKV, MP4)

var MALLUMV_BASE = "https://mallumv.life";

var MALLUMV_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": MALLUMV_BASE
};

function searchMalluMV(title, year) {
  var query = encodeURIComponent(title);
  var searchUrl = MALLUMV_BASE + "/?s=" + query;

  return fetch(searchUrl, { headers: MALLUMV_HEADERS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      // Extract article links from search results
      var links = [];
      var re = /href="(https?:\/\/mallumv\.life\/[^"]+)"/g;
      var m;
      while ((m = re.exec(html)) !== null) {
        var href = m[1];
        // Only keep movie post pages (not category/page/tag pages)
        if (href.indexOf("/category/") === -1 &&
            href.indexOf("/page/") === -1 &&
            href.indexOf("/tag/") === -1 &&
            href !== MALLUMV_BASE + "/" &&
            links.indexOf(href) === -1) {
          links.push(href);
        }
      }
      // Filter by year in URL or title match
      var filtered = links.filter(function (l) {
        return year ? l.indexOf(year) !== -1 || l.indexOf(title.toLowerCase().replace(/\s+/g, "-")) !== -1 : true;
      });
      return filtered.length > 0 ? filtered : links.slice(0, 3);
    });
}

function extractMalluMVStreams(postUrl) {
  return fetch(postUrl, { headers: MALLUMV_HEADERS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];

      // Extract all download/stream links
      // MalluMV uses HubCloud, FileMoon, StreamTape, and direct links
      var linkPatterns = [
        // HubCloud links
        /href="(https?:\/\/hubcloud\.[a-z]+\/[^"]+)"/gi,
        // Direct MKV/MP4 links
        /href="(https?:\/\/[^"]+\.(mkv|mp4|m3u8)[^"]*)"/gi,
        // StreamTape
        /href="(https?:\/\/streamtape\.[a-z]+\/[^"]+)"/gi,
        // FileMoon
        /href="(https?:\/\/filemoon\.[a-z]+\/[^"]+)"/gi,
        // GDrive
        /href="(https?:\/\/drive\.google\.com\/[^"]+)"/gi,
      ];

      // Extract quality labels near links
      var qualityRe = /(4K|2160p|1080p|720p|480p|HDRip|WEB-DL|WebRip|BluRay)/gi;
      var qualities = html.match(qualityRe) || [];

      linkPatterns.forEach(function (pattern, idx) {
        var m;
        var count = 0;
        while ((m = pattern.exec(html)) !== null && count < 5) {
          var url = m[1];
          var quality = qualities[idx] || qualities[count] || "HD";
          streams.push({
            name: "🎬 MalluMV",
            title: quality + " | MalluMV",
            url: url,
            quality: quality
          });
          count++;
        }
      });

      return streams;
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType === "tv" && !season) return Promise.resolve([]);

  // Fetch TMDB metadata to get title + year for search
  return fetch("https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId + "?language=en-US", {
    headers: { "Authorization": "Bearer " + (typeof TMDB_TOKEN !== "undefined" ? TMDB_TOKEN : "") }
  })
    .then(function (r) { return r.json(); })
    .then(function (meta) {
      var title = meta.title || meta.name || "";
      var year = (meta.release_date || meta.first_air_date || "").split("-")[0];
      // Also try original title for Malayalam/Tamil films
      var origTitle = meta.original_title || meta.original_name || title;

      return searchMalluMV(title, year)
        .then(function (links) {
          if (links.length === 0 && origTitle !== title) {
            return searchMalluMV(origTitle, year);
          }
          return links;
        })
        .then(function (links) {
          if (links.length === 0) return [];
          return extractMalluMVStreams(links[0]);
        });
    })
    .catch(function (e) {
      console.error("[MalluMV] Error:", e.message);
      return [];
    });
}

module.exports = { getStreams };
