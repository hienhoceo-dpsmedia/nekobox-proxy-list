# NekoBox US Subscription Design

**Date:** 2026-05-12

**Goal:** Build a repo-owned public subscription URL for NekoBox that is refreshed from `proxifly/free-proxy-list`, limited to U.S. proxies, and published as a base64-encoded subscription artifact.

## Scope

- Source data from `proxifly/free-proxy-list`
- Keep only `US` proxies
- Keep only `http`, `https`, `socks4`, `socks5`
- Publish:
  - plain text subscription
  - base64 subscription
  - debug splits by protocol
  - metadata for timestamps and counts
- Automate updates with GitHub Actions

## Design

- Fetch `proxies/countries/US/data.json` from upstream because it preserves protocol, country, and canonical proxy URI per row.
- Filter and deduplicate records in a small Node.js script.
- Build a plain-text subscription where each line is a proxy URI with a human-readable fragment name, then base64-encode the whole file for the main import URL.
- Commit generated artifacts back to `main` from GitHub Actions on a schedule and on manual dispatch.

## Output

- `dist/nekobox-us.txt`
- `dist/nekobox-us-base64.txt`
- `dist/debug/http-us.txt`
- `dist/debug/https-us.txt`
- `dist/debug/socks4-us.txt`
- `dist/debug/socks5-us.txt`
- `dist/metadata.json`

## Constraints

- This repo is not a fork of upstream.
- Keep implementation minimal; do not copy upstream crawler logic.
- Prefer stable raw GitHub URLs as the main public endpoint.
