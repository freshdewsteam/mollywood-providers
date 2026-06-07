# 🎬 Mollywood & Tamil Providers

A curated Nuvio plugin repository focused on **Malayalam and Tamil** content.  
Built for the Kerala/South Indian streaming community.

---

## 📦 Install in Nuvio

1. Open **Nuvio** → **Settings** → **Plugins**
2. Paste this URL and hit **Add**:

```
https://raw.githubusercontent.com/freshdewsteam/mollywood-providers/main/manifest.json
```

3. Enable the providers you want ✅

---

## 🔌 Providers Included

| Provider | Languages | Type | Movies | TV |
|---|---|---|---|---|
| **MalluMV** | Malayalam, Tamil, Telugu, Hindi, Kannada | Direct MKV/MP4 | ✅ | ❌ |
| **DVDPlay** | Malayalam, Tamil, Hindi | Direct MKV via HubCloud | ✅ | ❌ |
| **TamilBlasters** | Tamil, Malayalam, Telugu, Hindi | Magnet/Torrent WEB-DL | ✅ | ❌ |
| **TamilMV** | Tamil, Malayalam, Telugu | Magnet TRUE WEB-DL / 4K | ✅ | ❌ |
| **UHDMovies** | Hindi, Tamil (Dual Audio), English | Direct 4K/1080p GDrive | ✅ | ❌ |
| **NetMirror** | Multi (incl. Tamil, Malayalam) | HLS M3U8 | ✅ | ✅ |
| **NetMirrorNew** | Multi (incl. Tamil, Malayalam) | HLS M3U8 | ✅ | ✅ |

---

## ⚠️ Notes

- **TamilMV** and **TamilBlasters** return **magnet links** (torrent-based). You need a debrid service (Real-Debrid, AllDebrid, TorBox) or a torrent-capable player for best results.
- **NetMirror** is disabled on iOS due to player compatibility issues.
- **TamilMV** is heavily Cloudflare-protected. The provider will attempt multiple known domains but may return no results if all are blocked at your ISP level. Use a VPN if needed.
- Source sites change domains frequently. If a provider stops working, check this repo for updates or open an issue.

---

## 🔄 Keeping Up to Date

Nuvio fetches the manifest fresh each time. Provider JS files are updated here when source sites change domains. You don't need to reinstall — just make sure your Nuvio is connected to the internet when it loads.

---

## 🛠️ For Developers

Each provider exports a single `getStreams(tmdbId, mediaType, season, episode)` function using Promise chains (compatible with Nuvio's Hermes JS engine — no async/await in the bundled files).

To add or modify a provider:
1. Edit the relevant file in `providers/`
2. Update `manifest.json` if adding a new provider
3. Push to `main` branch — Nuvio picks up changes on next app load

---

## 🙏 Credits

Provider architecture based on [yoruix/nuvio-providers](https://github.com/yoruix/nuvio-providers).  
Part of the [Mollywood Addon](https://github.com/freshdewsteam/Mollywood-addon) project.

---

*Disclaimer: This repo scrapes third-party websites. Users are responsible for compliance with their local laws and the terms of service of any site accessed.*
