# NekoBox US Proxy List

Auto-updating U.S. proxy subscription for NekoBox, built from `proxifly/free-proxy-list`.

## Main URL

Use this URL in NekoBox for a base64 subscription:

```text
https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-us-base64.txt
```

## Alternative URLs

- Plain text subscription:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-us.txt`
- Metadata:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/metadata.json`
- jsDelivr mirror:
  `https://cdn.jsdelivr.net/gh/hienhoceo-dpsmedia/nekobox-proxy-list@main/dist/nekobox-us-base64.txt`

## Included Protocols

- HTTP
- HTTPS
- SOCKS4
- SOCKS5

Only proxies tagged as `US` by upstream are included.

## Output Files

- `dist/nekobox-us.txt`
- `dist/nekobox-us-base64.txt`
- `dist/metadata.json`
- `dist/debug/http-us.txt`
- `dist/debug/https-us.txt`
- `dist/debug/socks4-us.txt`
- `dist/debug/socks5-us.txt`

## How It Works

1. GitHub Actions fetches `proxies/countries/US/data.json` from upstream.
2. The build script keeps only `http`, `https`, `socks4`, and `socks5`.
3. Duplicate proxy URIs are removed.
4. The repo publishes:
   - a plain text subscription
   - a base64-encoded subscription
   - per-protocol debug files
   - metadata with counts and update time

## Local Commands

```bash
npm test
npm run build
```

## Update Schedule

The workflow runs:

- every 4 hours
- on manual `workflow_dispatch`

## Source

- Upstream data: `https://github.com/proxifly/free-proxy-list`
