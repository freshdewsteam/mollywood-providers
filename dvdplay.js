// DVDPlay Provider
// Source: dvdplay.com.co (domain rotates)
// Languages: Malayalam, Tamil, Hindi
// Type: Direct download links via HubCloud extraction

var DVDPLAY_DOMAINS = [
  "https://dvdplay.com.co",
  "https://dvdplay.show",
  "https://dvdplay.art"
];

var DVDPLAY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};

function tryDomain(domains, path) {
  if (domains.length === 0) return Promise.reject(new Error("All domains failed"));
  var domain = domains[0];
  var rest = domains.slice(1);
  return fetch(domain + path, { headers: DVDPLAY_HEADERS })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text().then(function (html) { return { html: html, base: domain }; });
    })
    .catch(function () { return tryDomain(rest, path); });
}

function searchDVDPlay(title, year) {
  var query = encodeURIComponent(title);
  return tryDomain(DVDPLAY_DOMAINS, "/?s=" + query)
    .then(function (result) {
      var html = result.html;
      var base = result.base;
      var links = [];
      var re = /href="(https?:\/\/[^"]*dvdplay[^"]*\/[^"]+)"/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        var href = m[1];
        if (href.indexOf("/category/") === -1 &&
            href.indexOf("/page/") === -1 &&
            href.indexOf("/tag/") === -1 &&
            href !== base + "/" &&
            links.indexOf(href) === -1) {
          links.push(href);
        }
      }
      if (year) {
        var withYear = links.filter(function (l) { return l.indexOf(year) !== -1; });
        if (withYear.length > 0) return withYear;
      }
      return links.slice(0, 3);
    });
}

function extractHubCloudLink(hubUrl) {
  return fetch(hubUrl, { headers: DVDPLAY_HEADERS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      // HubCloud redirects to direct download
      var directRe = /href="(https?:\/\/[^"]+\.(mkv|mp4|m3u8)[^"]*)"/gi;
      var m = directRe.exec(html);
      if (m) return m[1];
      // Also look for meta refresh redirect
      var metaRe = /content="\d+;\s*url='?([^'"]+)'?"/i;
      var mm = metaRe.exec(html);
      if (mm) return mm[1];
      return null;
    })
    .catch(function () { return null; });
}

function extractDVDPlayStreams(postUrl) {
  return fetch(postUrl, { headers: DVDPLAY_HEADERS })
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var streams = [];
      var qualityRe = /(4K|2160p|1080p|720p|480p)/gi;
      var qualities = html.match(qualityRe) || ["HD"];

      // Find HubCloud links
      var hubRe = /href="(https?:\/\/hubcloud\.[a-z]+\/[^"]+)"/gi;
      var m;
      var promises = [];
      var idx = 0;

      while ((m = hubRe.exec(html)) !== null && idx < 6) {
        (function (hubUrl, quality) {
          promises.push(
            extractHubCloudLink(hubUrl).then(function (directUrl) {
              if (directUrl) {
                streams.push({
                  name: "📀 DVDPlay",
                  title: quality + " | DVDPlay",
                  url: directUrl,
                  quality: quality
                });
              }
            })
          );
        })(m[1], qualities[idx] || "HD");
        idx++;
      }

      // Also check for direct links
      var directRe = /href="(https?:\/\/[^"]+\.(mkv|mp4)[^"]*)"/gi;
      while ((m = directRe.exec(html)) !== null) {
        streams.push({
          name: "📀 DVDPlay",
          title: (qualities[0] || "HD") + " | DVDPlay Direct",
          url: m[1],
          quality: qualities[0] || "HD"
        });
      }

      return Promise.all(promises).then(function () { return streams; });
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

      return searchDVDPlay(title, year)
        .then(function (links) {
          if (links.length === 0 && origTitle !== title) {
            return searchDVDPlay(origTitle, year);
          }
          return links;
        })
        .then(function (links) {
          if (links.length === 0) return [];
          return extractDVDPlayStreams(links[0]);
        });
    })
    .catch(function (e) {
      console.error("[DVDPlay] Error:", e.message);
      return [];
    });
}

module.exports = { getStreams };
