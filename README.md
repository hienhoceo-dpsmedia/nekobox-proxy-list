# NekoBox Proxy List 🚀

Auto-updating proxy list for **NekoBox** with fresh SOCKS5, SOCKS4, and HTTP proxies refreshed every 5 minutes.

## 📱 Quick Start

### Add to NekoBox:

1. Open **NekoBox**
2. Go to **Subscriptions → Add Subscription**
3. Paste this URL:
   ```
   https://cdn.jsdelivr.net/gh/hienhoceo-dpsmedia/nekobox-proxy-list@main/proxies/nekobox/subscription.txt
   ```
4. Click **Import** and let it sync
5. Your proxy list will auto-update every 5 minutes ✨

---

## 🔗 Direct Links

| Format | URL | Usage |
|--------|-----|-------|
| **Plain Text** | [subscription.txt](https://cdn.jsdelivr.net/gh/hienhoceo-dpsmedia/nekobox-proxy-list@main/proxies/nekobox/subscription.txt) | Use directly in NekoBox |
| **Base64** | [subscription.b64](https://cdn.jsdelivr.net/gh/hienhoceo-dpsmedia/nekobox-proxy-list@main/proxies/nekobox/subscription.b64) | Alternative encoding |
| **Metadata** | [metadata.json](https://cdn.jsdelivr.net/gh/hienhoceo-dpsmedia/nekobox-proxy-list@main/proxies/nekobox/metadata.json) | Stats & info |

---

## 📊 Features

✅ **Auto-updates every 5 minutes**  
✅ **Mixed proxy protocols**: SOCKS5, SOCKS4, HTTP  
✅ **Live on jsDelivr CDN** (global distribution)  
✅ **Automatic deduplication** (no duplicate proxies)  
✅ **NekoBox compatible format** (Trojan protocol URIs)  
✅ **Metadata tracking** (conversion stats)  

---

## 🔄 How It Works

1. **GitHub Actions** runs every 5 minutes
2. **Fetches** latest proxies from `proxifly/free-proxy-list`
3. **Converts** to NekoBox-compatible Trojan URIs
4. **Deduplicates** and validates
5. **Commits** to this repo
6. **jsDelivr** CDN caches and distributes globally

---

## 📈 Proxy Format

**Original** (from Proxifly):
```
socks5://72.49.49.11:31034
```

**Converted** (NekoBox compatible):
```
trojan://nekobox@72.49.49.11:31034#72.49.49.11-31034
```

---

## 📝 Metadata

Check `metadata.json` for current stats:
- Total proxy count
- Breakdown by protocol (SOCKS5, SOCKS4, HTTP)
- Last update timestamp

---

## 🔧 Technical Details

- **Source**: [proxifly/free-proxy-list](https://github.com/proxifly/free-proxy-list)
- **Converter**: Node.js script (`nekobox-converter.js`)
- **CI/CD**: GitHub Actions
- **CDN**: jsDelivr
- **Update Frequency**: Every 5 minutes

---

## ⚖️ Legal

This repository fetches publicly available proxy lists. Please respect:
- Terms of service of proxy providers
- Local laws regarding proxy usage
- Bandwidth and resource limits

---

## 🐛 Issues?

If proxies aren't working:
1. Check metadata.json for current count
2. Try refreshing in NekoBox
3. Wait 5 minutes for new batch
4. Some proxies may have geo-restrictions

---

**Last Updated**: Generated automatically every 5 minutes  
**Maintainer**: [@hienhoceo-dpsmedia](https://github.com/hienhoceo-dpsmedia)
