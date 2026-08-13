import net from "node:net";
import tls from "node:tls";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_PROTOCOLS = ["http", "https", "socks4", "socks5"];
const US_SOURCE_URL =
  "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/countries/US/data.json";
const ALL_SOURCE_URL =
  "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.json";
const GREATER_CHINA_COUNTRIES = new Set(["CN", "HK", "MO", "TW"]);
const LIVE_PROBE_URL = new URL("https://example.com/");
const LIVE_PROBE_TIMEOUT_MS = 5_000;

function isCountryRecord(record, country) {
  return record?.geolocation?.country === country;
}

function isSupportedProtocol(record) {
  return SUPPORTED_PROTOCOLS.includes(record?.protocol);
}

function normalizeProxyLine(proxy, protocol, index) {
  return `${proxy}#US-${protocol.toUpperCase()}-${index}`;
}

function normalizeNamedProxyLine(proxy, label, protocol, index) {
  return `${proxy}#${label}-${protocol.toUpperCase()}-${index}`;
}

export function filterSupportedUsRecords(records) {
  return filterSupportedCountryRecords(records, "US");
}

function filterSupportedCountryRecords(records, country) {
  const seen = new Set();
  const filtered = [];

  for (const record of records) {
    if (!isCountryRecord(record, country) || !isSupportedProtocol(record) || typeof record?.proxy !== "string") {
      continue;
    }

    if (seen.has(record.proxy)) {
      continue;
    }

    seen.add(record.proxy);
    filtered.push(record);
  }

  return filtered;
}

export function filterSupportedGreaterChinaRecords(records) {
  const seen = new Set();
  const filtered = [];

  for (const record of records) {
    if (
      !GREATER_CHINA_COUNTRIES.has(record?.geolocation?.country) ||
      !isSupportedProtocol(record) ||
      typeof record?.proxy !== "string" ||
      seen.has(record.proxy)
    ) {
      continue;
    }

    seen.add(record.proxy);
    filtered.push(record);
  }

  return filtered;
}

export function filterSupportedNonChinaRecords(records) {
  const seen = new Set();
  const filtered = [];

  for (const record of records) {
    const country = record?.geolocation?.country;
    if (
      !country ||
      GREATER_CHINA_COUNTRIES.has(country) ||
      !isSupportedProtocol(record) ||
      typeof record?.proxy !== "string"
    ) {
      continue;
    }

    if (seen.has(record.proxy)) {
      continue;
    }

    seen.add(record.proxy);
    filtered.push(record);
  }

  return filtered;
}

export function filterSocks5Only(records) {
  return records.filter((record) => record?.protocol === "socks5");
}

function connectToProxy(proxyUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port) || (proxyUrl.protocol === "https:" ? 443 : 80)
    });

    const fail = (error) => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(timeoutMs, () => fail(new Error("Proxy connection timed out")));
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.setTimeout(0);
      socket.removeListener("error", fail);
      resolve(socket);
    });
  });
}

function connectToHttpsProxy(proxyUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port) || 443,
      servername: proxyUrl.hostname
    });

    const fail = (error) => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(timeoutMs, () => fail(new Error("HTTPS proxy connection timed out")));
    socket.once("error", fail);
    socket.once("secureConnect", () => {
      socket.setTimeout(0);
      socket.removeListener("error", fail);
      resolve(socket);
    });
  });
}

function waitForHttpResponse(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => onError(new Error("HTTP response timed out")), timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => onError(new Error("HTTP proxy closed the connection"));
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      cleanup();
      resolve(buffer.subarray(0, headerEnd).toString("ascii").split("\r\n", 1)[0]);
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

export function isSuccessfulHttpConnectResponse(statusLine) {
  return /^HTTP\/1\.[01]\s+2\d\d\b/i.test(statusLine);
}

export function isSuccessfulHttpsProbeResponse(statusLine) {
  return /^HTTP\/1\.[01]\s+[23]\d\d\b/i.test(statusLine);
}

function upgradeConnectionToTls(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: LIVE_PROBE_URL.hostname
    });
    const timeout = setTimeout(() => fail(new Error("HTTPS target handshake timed out")), timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      secureSocket.removeListener("error", fail);
      secureSocket.removeListener("close", onClose);
    };
    const fail = (error) => {
      cleanup();
      secureSocket.destroy();
      reject(error);
    };
    const onClose = () => fail(new Error("HTTPS target closed the connection"));

    secureSocket.once("error", fail);
    secureSocket.once("close", onClose);
    secureSocket.once("secureConnect", () => {
      cleanup();
      resolve(secureSocket);
    });
  });
}

async function probeHttpsTarget(socket, timeoutMs) {
  const secureSocket = await upgradeConnectionToTls(socket, timeoutMs);
  try {
    secureSocket.write(
      `GET ${LIVE_PROBE_URL.pathname} HTTP/1.1\r\n` +
        `Host: ${LIVE_PROBE_URL.host}\r\n` +
        "User-Agent: nekobox-proxy-list-liveness-check\r\n" +
        "Connection: close\r\n\r\n"
    );
    return isSuccessfulHttpsProbeResponse(await waitForHttpResponse(secureSocket, timeoutMs));
  } finally {
    secureSocket.destroy();
  }
}

function waitForSocks5Greeting(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => onError(new Error("SOCKS5 greeting timed out")), timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => onError(new Error("SOCKS5 proxy closed the connection"));
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 2) {
        return;
      }

      cleanup();
      resolve(buffer.subarray(0, 2));
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

function waitForSocks5Reply(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => onError(new Error("SOCKS5 request timed out")), timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => onError(new Error("SOCKS5 proxy closed the connection"));
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 5) {
        return;
      }

      if (![1, 3, 4].includes(buffer[3])) {
        onError(new Error("SOCKS5 proxy returned an invalid address type"));
        return;
      }

      const addressLength = buffer[3] === 1 ? 4 : buffer[3] === 4 ? 16 : buffer[4] + 1;
      const replyLength = 4 + addressLength + 2;
      if (buffer.length < replyLength) {
        return;
      }

      cleanup();
      resolve(buffer.subarray(0, replyLength));
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

function waitForSocks4Reply(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => onError(new Error("SOCKS4 request timed out")), timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => onError(new Error("SOCKS4 proxy closed the connection"));
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 8) {
        return;
      }

      cleanup();
      resolve(buffer.subarray(0, 8));
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function probeHttpProxy(record, timeoutMs) {
  const proxyUrl = new URL(record.proxy);
  const socket =
    record.protocol === "https"
      ? await connectToHttpsProxy(proxyUrl, timeoutMs)
      : await connectToProxy(proxyUrl, timeoutMs);
  try {
    socket.write(
      `CONNECT ${LIVE_PROBE_URL.hostname}:${LIVE_PROBE_URL.port} HTTP/1.1\r\n` +
        `Host: ${LIVE_PROBE_URL.host}\r\n` +
        "User-Agent: nekobox-proxy-list-liveness-check\r\n" +
        "Connection: close\r\n\r\n"
    );
    const responseLine = await waitForHttpResponse(socket, timeoutMs);
    return (
      isSuccessfulHttpConnectResponse(responseLine) &&
      (await probeHttpsTarget(socket, timeoutMs))
    );
  } finally {
    socket.destroy();
  }
}

async function probeSocks4Proxy(record, timeoutMs) {
  const proxyUrl = new URL(record.proxy);
  const socket = await connectToProxy(proxyUrl, timeoutMs);
  try {
    const request = Buffer.from([4, 1, 1, 187, 93, 184, 216, 34, 0]);
    socket.write(request);
    const response = await waitForSocks4Reply(socket, timeoutMs);
    return response[0] === 0 && response[1] === 90 && (await probeHttpsTarget(socket, timeoutMs));
  } finally {
    socket.destroy();
  }
}

async function probeSocks5Proxy(record, timeoutMs) {
  const proxyUrl = new URL(record.proxy);
  const socket = await connectToProxy(proxyUrl, timeoutMs);
  try {
    socket.write(Buffer.from([5, 1, 0]));
    const greeting = await waitForSocks5Greeting(socket, timeoutMs);
    if (greeting[0] !== 5 || greeting[1] !== 0) {
      return false;
    }

    const hostname = Buffer.from(LIVE_PROBE_URL.hostname, "ascii");
    socket.write(
      Buffer.concat([
        Buffer.from([5, 1, 0, 3, hostname.length]),
        hostname,
        Buffer.from([1, 187])
      ])
    );
    const response = await waitForSocks5Reply(socket, timeoutMs);
    return response[0] === 5 && response[1] === 0 && (await probeHttpsTarget(socket, timeoutMs));
  } finally {
    socket.destroy();
  }
}

async function probeLiveProxy(record, timeoutMs = LIVE_PROBE_TIMEOUT_MS) {
  try {
    if (record.protocol === "http" || record.protocol === "https") {
      return await probeHttpProxy(record, timeoutMs);
    }

    if (record.protocol === "socks4") {
      return await probeSocks4Proxy(record, timeoutMs);
    }

    if (record.protocol === "socks5") {
      return await probeSocks5Proxy(record, timeoutMs);
    }
  } catch {
    return false;
  }

  return false;
}

export async function filterLiveRecords(records, probe = probeLiveProxy) {
  const results = await Promise.all(
    records.map(async (record) => {
      try {
        return { record, isLive: await probe(record) };
      } catch {
        return { record, isLive: false };
      }
    })
  );

  return results.filter(({ isLive }) => isLive).map(({ record }) => record);
}

export function buildArtifacts(
  records,
  updatedAt = new Date().toISOString(),
  label = "US",
  sourceUrl = US_SOURCE_URL,
  metadataDetails = {}
) {
  const linesByProtocol = {
    http: [],
    https: [],
    socks4: [],
    socks5: []
  };

  const orderedLines = [];

  for (const protocol of SUPPORTED_PROTOCOLS) {
    const protocolRecords = records.filter((record) => record.protocol === protocol);
    protocolRecords.forEach((record, index) => {
      const line =
        label === "US"
          ? normalizeProxyLine(record.proxy, protocol, index + 1)
          : normalizeNamedProxyLine(record.proxy, label, protocol, index + 1);
      linesByProtocol[protocol].push(line);
      orderedLines.push(line);
    });
  }

  const subscriptionText = orderedLines.join("\n");
  const subscriptionBase64 = Buffer.from(subscriptionText, "utf8").toString("base64");
  const protocolCounts = Object.fromEntries(
    SUPPORTED_PROTOCOLS.map((protocol) => [protocol, linesByProtocol[protocol].length])
  );

  return {
    subscriptionText,
    subscriptionBase64,
    debugByProtocol: Object.fromEntries(
      SUPPORTED_PROTOCOLS.map((protocol) => [protocol, linesByProtocol[protocol].join("\n")])
    ),
    metadata: {
      sourceUrl,
      label,
      protocols: SUPPORTED_PROTOCOLS,
      total: orderedLines.length,
      protocolCounts,
      updatedAt,
      ...metadataDetails
    }
  };
}

async function fetchSourceRecords(sourceUrl = US_SOURCE_URL) {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "nekobox-proxy-list-builder"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function writeArtifacts(artifacts, outDir) {
  await mkdir(path.join(outDir, "debug"), { recursive: true });

  await Promise.all([
    writeFile(path.join(outDir, "nekobox-us.txt"), `${artifacts.subscriptionText}\n`, "utf8"),
    writeFile(
      path.join(outDir, "nekobox-us-base64.txt"),
      `${artifacts.subscriptionBase64}\n`,
      "utf8"
    ),
    writeFile(
      path.join(outDir, "metadata.json"),
      `${JSON.stringify(artifacts.metadata, null, 2)}\n`,
      "utf8"
    ),
    ...SUPPORTED_PROTOCOLS.map((protocol) =>
      writeFile(
        path.join(outDir, "debug", `${protocol}-us.txt`),
        artifacts.debugByProtocol[protocol]
          ? `${artifacts.debugByProtocol[protocol]}\n`
          : "",
        "utf8"
      )
    )
  ]);
}

async function writeGreaterChinaLiveArtifacts(artifacts, outDir) {
  await mkdir(path.join(outDir, "debug"), { recursive: true });

  await Promise.all([
    writeFile(path.join(outDir, "nekobox-china-live.txt"), `${artifacts.subscriptionText}\n`, "utf8"),
    writeFile(
      path.join(outDir, "nekobox-china-live-base64.txt"),
      `${artifacts.subscriptionBase64}\n`,
      "utf8"
    ),
    writeFile(
      path.join(outDir, "metadata-china-live.json"),
      `${JSON.stringify(artifacts.metadata, null, 2)}\n`,
      "utf8"
    ),
    ...SUPPORTED_PROTOCOLS.map((protocol) =>
      writeFile(
        path.join(outDir, "debug", `${protocol}-china-live.txt`),
        artifacts.debugByProtocol[protocol]
          ? `${artifacts.debugByProtocol[protocol]}\n`
          : "",
        "utf8"
      )
    )
  ]);
}

export async function runBuild({
  usSourceUrl = US_SOURCE_URL,
  allSourceUrl = ALL_SOURCE_URL,
  outDir = path.resolve(process.cwd(), "dist"),
  updatedAt = new Date().toISOString(),
  liveProbe = probeLiveProxy
} = {}) {
  const [usRawRecords, allRawRecords] = await Promise.all([
    fetchSourceRecords(usSourceUrl),
    fetchSourceRecords(allSourceUrl)
  ]);
  const usFilteredRecords = filterSupportedUsRecords(usRawRecords);
  const greaterChinaLiveRecords = await filterLiveRecords(
    filterSupportedGreaterChinaRecords(allRawRecords),
    liveProbe
  );
  const nonChinaFilteredRecords = filterSupportedNonChinaRecords(allRawRecords);

  const usArtifacts = buildArtifacts(usFilteredRecords, updatedAt, "US", usSourceUrl);
  const greaterChinaLiveArtifacts = buildArtifacts(
    greaterChinaLiveRecords,
    updatedAt,
    "GREATER-CHINA-LIVE",
    allSourceUrl,
    {
      liveOnly: true,
      probeUrl: LIVE_PROBE_URL.href,
      probeTimeoutMs: LIVE_PROBE_TIMEOUT_MS,
      countries: [...GREATER_CHINA_COUNTRIES],
      livenessRequirement: "TLS handshake and HTTPS target response 2xx-3xx"
    }
  );
  const nonChinaArtifacts = buildArtifacts(
    nonChinaFilteredRecords,
    updatedAt,
    "GLOBAL-NON-CHINA",
    allSourceUrl
  );
  const nonChinaSocks5Artifacts = buildArtifacts(
    filterSocks5Only(nonChinaFilteredRecords),
    updatedAt,
    "GLOBAL-NON-CHINA-SOCKS5",
    allSourceUrl
  );

  await writeArtifacts(usArtifacts, outDir);
  await writeGreaterChinaLiveArtifacts(greaterChinaLiveArtifacts, outDir);
  await Promise.all([
    writeFile(path.join(outDir, "nekobox-global-excluding-cn-hk-mo-tw.txt"), `${nonChinaArtifacts.subscriptionText}\n`, "utf8"),
    writeFile(
      path.join(outDir, "nekobox-global-excluding-cn-hk-mo-tw-base64.txt"),
      `${nonChinaArtifacts.subscriptionBase64}\n`,
      "utf8"
    ),
    writeFile(
      path.join(outDir, "metadata-global-excluding-cn-hk-mo-tw.json"),
      `${JSON.stringify(nonChinaArtifacts.metadata, null, 2)}\n`,
      "utf8"
    ),
    writeFile(
      path.join(outDir, "nekobox-global-excluding-cn-hk-mo-tw-socks5.txt"),
      `${nonChinaSocks5Artifacts.subscriptionText}\n`,
      "utf8"
    ),
    writeFile(
      path.join(outDir, "nekobox-global-excluding-cn-hk-mo-tw-socks5-base64.txt"),
      `${nonChinaSocks5Artifacts.subscriptionBase64}\n`,
      "utf8"
    ),
    writeFile(
      path.join(outDir, "metadata-global-excluding-cn-hk-mo-tw-socks5.json"),
      `${JSON.stringify(nonChinaSocks5Artifacts.metadata, null, 2)}\n`,
      "utf8"
    )
  ]);

  return {
    usArtifacts,
    greaterChinaLiveArtifacts,
    nonChinaArtifacts,
    nonChinaSocks5Artifacts
  };
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFilePath === currentFilePath) {
  runBuild().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
