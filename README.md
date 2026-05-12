# NekoBox US Proxy List

Auto-updating U.S. proxy subscription for NekoBox, built from `proxifly/free-proxy-list`.

## Main URL

Use this URL in NekoBox for a base64 subscription:

```text
https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-us-base64.txt
```

Additional base64 URL for all countries except `CN`, `HK`, `MO`, and `TW`:

```text
https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-global-excluding-cn-hk-mo-tw-base64.txt
```

Additional base64 URL for all countries except `CN`, `HK`, `MO`, and `TW`, with `SOCKS5` only:

```text
https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-global-excluding-cn-hk-mo-tw-socks5-base64.txt
```

## Alternative URLs

- Plain text subscription:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-us.txt`
- Plain text subscription for all except `CN/HK/MO/TW`:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-global-excluding-cn-hk-mo-tw.txt`
- Plain text subscription for all except `CN/HK/MO/TW`, `SOCKS5` only:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/nekobox-global-excluding-cn-hk-mo-tw-socks5.txt`
- Metadata:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/metadata.json`
- Metadata for all except `CN/HK/MO/TW`:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/metadata-global-excluding-cn-hk-mo-tw.json`
- Metadata for all except `CN/HK/MO/TW`, `SOCKS5` only:
  `https://raw.githubusercontent.com/hienhoceo-dpsmedia/nekobox-proxy-list/main/dist/metadata-global-excluding-cn-hk-mo-tw-socks5.json`
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
- `dist/nekobox-global-excluding-cn-hk-mo-tw.txt`
- `dist/nekobox-global-excluding-cn-hk-mo-tw-base64.txt`
- `dist/nekobox-global-excluding-cn-hk-mo-tw-socks5.txt`
- `dist/nekobox-global-excluding-cn-hk-mo-tw-socks5-base64.txt`
- `dist/metadata.json`
- `dist/metadata-global-excluding-cn-hk-mo-tw.json`
- `dist/metadata-global-excluding-cn-hk-mo-tw-socks5.json`
- `dist/debug/http-us.txt`
- `dist/debug/https-us.txt`
- `dist/debug/socks4-us.txt`
- `dist/debug/socks5-us.txt`

## How It Works

1. GitHub Actions fetches `proxies/countries/US/data.json` from upstream.
2. The build script also fetches `proxies/all/data.json` for the global non-China list.
3. It keeps only `http`, `https`, `socks4`, and `socks5`.
4. It removes `CN`, `HK`, `MO`, and `TW` from the global list.
5. Duplicate proxy URIs are removed.
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
