// UHDMovies Provider
// Source: uhdmovies.stream (domain rotates)
// Languages: Hindi, Tamil (dual audio), English
// Type: Direct Google Drive / HubCloud links, 4K HDR, 1080p

var UHDMOVIES_DOMAINS = [
  "https://uhdmovies.stream",
  "https://uhdmovies.pink",
  "https://uhdmovies.club"
];

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

function tryDomains(domains, path) {
  if (domains.length === 0) return Promise.reject(new Error("All domains failed"));
  return fetch(domains[0] + path, { headers: HEADERS })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text().then(function (h) { return { html: h, base: domains[0] }; });
    })
    .catch(function () { return tryDomains(domains.slice(1), path); });
}

function searchUHD(title, year) {
  return tryDomains(UHDMOVIES_DOMAINS, "/?s=" + encodeURIComponent(title))
    .then(function (res) {
      var html = res.html;
      var links = [];
      // UHDMovies uses WordPress, posts are in article tags
      var re = /class="post-title[^"]*"[^>]*>\s*<a\s+href="([^"]+)"/gi;
      var m;
      while ((m = re.exec(html)) !== null) links.push(m[1]);
      // Fallback: any internal post link
      if (links.length === 0) {
        var re2 = /href="(https?:\/\/uhdmovies[^"]+\/[a-z0-9-]+\/)"/gi;
        while ((m = re2.exec(html)) !== null) {
          if (links.indexOf(m[1]) === -1) links.push(m[1]);
        }
      }
      if (year) {
        var withYear = links.filter(function (l) { return l.indexOf(year) !== -1; });
        if (withYear.length > 0) return withYear.slice(0, 3);
      }
      return links.slice(0, 3);
    });
}

function extractUHDStreams(postUrl) {
  return fetch(postUrl, { headers: HEADERS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];

      // Extract quality sections - UHDMovies organises by quality
      var sections = html.split(/<h[23456][^>]*>/i);
      var qualityMap = {
        "4k": "4K HDR", "2160p": "4K HDR", "hdr": "4K HDR",
        "1080p": "1080p", "720p": "720p", "480p": "480p"
      };

      var allLinks = [];
      // GDrive links
      var gdRe = /href="(https?:\/\/drive\.google\.com\/[^"]+)"/gi;
      var m;
      while ((m = gdRe.exec(html)) !== null) allLinks.push({ url: m[1], type: "GDrive" });

      // HubCloud links
      var hcRe = /href="(https?:\/\/hubcloud\.[a-z]+\/[^"]+)"/gi;
      while ((m = hcRe.exec(html)) !== null) allLinks.push({ url: m[1], type: "HubCloud" });

      // Direct MKV
      var mkvRe = /href="(https?:\/\/[^"]+\.mkv[^"]*)"/gi;
      while ((m = mkvRe.exec(html)) !== null) allLinks.push({ url: m[1], type: "Direct" });

      // Try to assign quality by scanning text before each link
      allLinks.slice(0, 8).forEach(function (link, i) {
        // Find the position of this URL in html and look backward 200 chars for quality
        var pos = html.indexOf(link.url);
        var ctx = pos > 200 ? html.substring(pos - 200, pos) : html.substring(0, pos);
        var quality = "HD";
        Object.keys(qualityMap).forEach(function (k) {
          if (ctx.toLowerCase().indexOf(k) !== -1) quality = qualityMap[k];
        });
        // Check for dual audio
        var isDual = ctx.toLowerCase().indexOf("dual") !== -1 || ctx.toLowerCase().indexOf("tamil") !== -1;
        streams.push({
          name: "🔷 UHDMovies",
          title: quality + (isDual ? " | Dual Audio" : "") + " | " + link.type,
          url: link.url,
          quality: quality
        });
      });

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
      var year = (meta.release_date || "").split("-")[0];
      return searchUHD(title, year)
        .then(function (links) {
          if (links.length === 0) return [];
          return extractUHDStreams(links[0]);
        });
    })
    .catch(function (e) {
      console.error("[UHDMovies] Error:", e.message);
      return [];
    });
}

module.exports = { getStreams };
