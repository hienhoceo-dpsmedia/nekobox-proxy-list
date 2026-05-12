import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_PROTOCOLS = ["http", "https", "socks4", "socks5"];
const SOURCE_URL =
  "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/countries/US/data.json";

function isUsRecord(record) {
  return record?.geolocation?.country === "US";
}

function isSupportedProtocol(record) {
  return SUPPORTED_PROTOCOLS.includes(record?.protocol);
}

function normalizeProxyLine(proxy, protocol, index) {
  return `${proxy}#US-${protocol.toUpperCase()}-${index}`;
}

export function filterSupportedUsRecords(records) {
  const seen = new Set();
  const filtered = [];

  for (const record of records) {
    if (!isUsRecord(record) || !isSupportedProtocol(record) || typeof record?.proxy !== "string") {
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

export function buildArtifacts(records, updatedAt = new Date().toISOString()) {
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
      const line = normalizeProxyLine(record.proxy, protocol, index + 1);
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
      sourceUrl: SOURCE_URL,
      country: "US",
      protocols: SUPPORTED_PROTOCOLS,
      total: orderedLines.length,
      protocolCounts,
      updatedAt
    }
  };
}

async function fetchSourceRecords(sourceUrl = SOURCE_URL) {
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

export async function runBuild({
  sourceUrl = SOURCE_URL,
  outDir = path.resolve(process.cwd(), "dist"),
  updatedAt = new Date().toISOString()
} = {}) {
  const rawRecords = await fetchSourceRecords(sourceUrl);
  const filteredRecords = filterSupportedUsRecords(rawRecords);
  const artifacts = buildArtifacts(filteredRecords, updatedAt);

  await writeArtifacts(artifacts, outDir);
  return artifacts;
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFilePath === currentFilePath) {
  runBuild().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
