import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArtifacts,
  filterLiveRecords,
  filterSupportedGreaterChinaRecords,
  filterSupportedUsRecords,
  filterSupportedNonChinaRecords,
  filterSocks5Only,
  isSuccessfulHttpConnectResponse,
  isSuccessfulHttpsProbeResponse,
} from "../scripts/build-nekobox-subscription.mjs";

test("filterSupportedGreaterChinaRecords keeps supported CN, TW, HK, and MO proxies across every protocol", () => {
  const input = [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "CN" } },
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "CN" } },
    { proxy: "https://2.2.2.2:443", protocol: "https", geolocation: { country: "TW" } },
    { proxy: "socks4://3.3.3.3:1080", protocol: "socks4", geolocation: { country: "HK" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "MO" } },
    { proxy: "vmess://not-supported", protocol: "vmess", geolocation: { country: "CN" } },
    { proxy: "http://3.3.3.3:80", protocol: "http", geolocation: { country: "US" } }
  ];

  assert.deepEqual(filterSupportedGreaterChinaRecords(input), [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "CN" } },
    { proxy: "https://2.2.2.2:443", protocol: "https", geolocation: { country: "TW" } },
    { proxy: "socks4://3.3.3.3:1080", protocol: "socks4", geolocation: { country: "HK" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "MO" } }
  ]);
});

test("isSuccessfulHttpConnectResponse accepts only successful CONNECT status lines", () => {
  assert.equal(isSuccessfulHttpConnectResponse("HTTP/1.1 200 Connection established"), true);
  assert.equal(isSuccessfulHttpConnectResponse("HTTP/1.0 204 No Content"), true);
  assert.equal(isSuccessfulHttpConnectResponse("HTTP/1.1 400 Bad Request"), false);
  assert.equal(isSuccessfulHttpConnectResponse("not an HTTP response"), false);
});

test("isSuccessfulHttpsProbeResponse accepts only successful HTTPS target responses", () => {
  assert.equal(isSuccessfulHttpsProbeResponse("HTTP/1.1 200 OK"), true);
  assert.equal(isSuccessfulHttpsProbeResponse("HTTP/1.1 302 Found"), true);
  assert.equal(isSuccessfulHttpsProbeResponse("HTTP/1.1 503 Service Unavailable"), false);
  assert.equal(isSuccessfulHttpsProbeResponse("not an HTTP response"), false);
});

test("filterLiveRecords keeps only proxies whose liveness probe succeeds", async () => {
  const records = [
    { proxy: "http://live.example:80", protocol: "http", geolocation: { country: "CN" } },
    { proxy: "socks5://down.example:1080", protocol: "socks5", geolocation: { country: "CN" } },
    { proxy: "http://live-two.example:8080", protocol: "http", geolocation: { country: "CN" } }
  ];
  const probed = [];

  const liveRecords = await filterLiveRecords(records, async (record) => {
    probed.push(record.proxy);
    if (record.proxy.includes("down")) {
      throw new Error("connection refused");
    }
    return record.proxy.includes("live");
  });

  assert.deepEqual(probed, records.map((record) => record.proxy));
  assert.deepEqual(liveRecords, [records[0], records[2]]);
});

test("filterSupportedUsRecords keeps only supported US protocols and deduplicates proxy URIs", () => {
  const input = [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "US" } },
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "US" } },
    { proxy: "https://2.2.2.2:443", protocol: "https", geolocation: { country: "US" } },
    { proxy: "socks4://3.3.3.3:1080", protocol: "socks4", geolocation: { country: "US" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "US" } },
    { proxy: "vmess://not-supported", protocol: "vmess", geolocation: { country: "US" } },
    { proxy: "http://5.5.5.5:80", protocol: "http", geolocation: { country: "CA" } }
  ];

  assert.deepEqual(filterSupportedUsRecords(input), [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "US" } },
    { proxy: "https://2.2.2.2:443", protocol: "https", geolocation: { country: "US" } },
    { proxy: "socks4://3.3.3.3:1080", protocol: "socks4", geolocation: { country: "US" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "US" } }
  ]);
});

test("buildArtifacts emits plain text, base64, protocol debug splits, and metadata", () => {
  const input = [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "US" } },
    { proxy: "https://2.2.2.2:443", protocol: "https", geolocation: { country: "US" } },
    { proxy: "socks4://3.3.3.3:1080", protocol: "socks4", geolocation: { country: "US" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "US" } }
  ];

  const artifacts = buildArtifacts(input, "2026-05-12T16:00:00.000Z");

  assert.equal(
    artifacts.subscriptionText,
    [
      "http://1.1.1.1:80#US-HTTP-1",
      "https://2.2.2.2:443#US-HTTPS-1",
      "socks4://3.3.3.3:1080#US-SOCKS4-1",
      "socks5://4.4.4.4:1080#US-SOCKS5-1"
    ].join("\n")
  );
  assert.equal(
    Buffer.from(artifacts.subscriptionBase64, "base64").toString("utf8"),
    artifacts.subscriptionText
  );
  assert.equal(artifacts.debugByProtocol.http, "http://1.1.1.1:80#US-HTTP-1");
  assert.equal(artifacts.debugByProtocol.https, "https://2.2.2.2:443#US-HTTPS-1");
  assert.equal(artifacts.debugByProtocol.socks4, "socks4://3.3.3.3:1080#US-SOCKS4-1");
  assert.equal(artifacts.debugByProtocol.socks5, "socks5://4.4.4.4:1080#US-SOCKS5-1");
  assert.deepEqual(artifacts.metadata.protocolCounts, {
    http: 1,
    https: 1,
    socks4: 1,
    socks5: 1
  });
  assert.equal(artifacts.metadata.total, 4);
  assert.equal(artifacts.metadata.updatedAt, "2026-05-12T16:00:00.000Z");
});

test("filterSupportedNonChinaRecords excludes CN, HK, MO, and TW while keeping supported protocols", () => {
  const input = [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "US" } },
    { proxy: "https://2.2.2.2:443", protocol: "https", geolocation: { country: "JP" } },
    { proxy: "socks4://3.3.3.3:1080", protocol: "socks4", geolocation: { country: "CN" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "HK" } },
    { proxy: "http://5.5.5.5:80", protocol: "http", geolocation: { country: "MO" } },
    { proxy: "https://6.6.6.6:443", protocol: "https", geolocation: { country: "TW" } },
    { proxy: "socks5://7.7.7.7:1080", protocol: "socks5", geolocation: { country: "SG" } },
    { proxy: "vmess://not-supported", protocol: "vmess", geolocation: { country: "US" } }
  ];

  assert.deepEqual(filterSupportedNonChinaRecords(input), [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "US" } },
    { proxy: "https://2.2.2.2:443", protocol: "https", geolocation: { country: "JP" } },
    { proxy: "socks5://7.7.7.7:1080", protocol: "socks5", geolocation: { country: "SG" } }
  ]);
});

test("filterSocks5Only keeps only socks5 records and preserves order", () => {
  const input = [
    { proxy: "http://1.1.1.1:80", protocol: "http", geolocation: { country: "US" } },
    { proxy: "socks5://2.2.2.2:1080", protocol: "socks5", geolocation: { country: "JP" } },
    { proxy: "socks4://3.3.3.3:1080", protocol: "socks4", geolocation: { country: "SG" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "US" } }
  ];

  assert.deepEqual(filterSocks5Only(input), [
    { proxy: "socks5://2.2.2.2:1080", protocol: "socks5", geolocation: { country: "JP" } },
    { proxy: "socks5://4.4.4.4:1080", protocol: "socks5", geolocation: { country: "US" } }
  ]);
});
