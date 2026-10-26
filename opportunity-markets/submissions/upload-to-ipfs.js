import { readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ipfsPublish from "./ipfs-publish.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const MANIFEST_PATH = path.join(ROOT, "ipfs-manifest.json");
const IGNORED_LOG_PATH = path.join(ROOT, "ipfs-upload-ignored.log");
const FAILED_LOG_PATH = path.join(ROOT, "ipfs-upload-failed.log");
const CONCURRENCY = 3;

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".pdf"]);

const SKIP_ROOT_NAMES = new Set([
  "ipfs-publish.js",
  "upload-to-ipfs.js",
  "ipfs-manifest.json",
  "ipfs-upload-ignored.log",
]);

/**
 * @typedef {{ name: string, localPath: string, ipfsPath: string }} ManifestFile
 * @typedef {{ generatedAt: string, markets: Record<string, Record<string, ManifestFile[]>> }} Manifest
 */

/**
 * @param {string} dir
 * @returns {Promise<string[]>} absolute file paths
 */
async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * @param {string} filePath
 */
function getExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * @param {string} relativePath posix-style relative to submissions/
 */
function toIpfsFileName(relativePath) {
  return relativePath.split("/").join("__");
}

/**
 * @param {string} relativePath
 * @returns {{ market: string, submissionId: string }}
 */
function parseMarketSubmission(relativePath) {
  const parts = relativePath.split("/");
  const market = parts[0];
  const submissionId = parts.length >= 2 ? parts[1] : "_";
  return { market, submissionId };
}

/**
 * @returns {Promise<Manifest>}
 */
async function loadManifest() {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return { generatedAt: new Date().toISOString(), markets: {} };
    }
    throw err;
  }
}

/**
 * @param {Manifest} manifest
 * @param {string} localPath
 * @returns {string | undefined}
 */
function findExistingIpfsPath(manifest, localPath) {
  for (const submissions of Object.values(manifest.markets)) {
    for (const files of Object.values(submissions)) {
      const match = files.find((f) => f.localPath === localPath && f.ipfsPath);
      if (match) return match.ipfsPath;
    }
  }
  return undefined;
}

/**
 * @param {Manifest} manifest
 * @param {string} market
 * @param {string} submissionId
 * @param {ManifestFile} entry
 */
function upsertManifestEntry(manifest, market, submissionId, entry) {
  if (!manifest.markets[market]) {
    manifest.markets[market] = {};
  }
  if (!manifest.markets[market][submissionId]) {
    manifest.markets[market][submissionId] = [];
  }

  const list = manifest.markets[market][submissionId];
  const index = list.findIndex((f) => f.localPath === entry.localPath);
  if (index >= 0) {
    list[index] = entry;
  } else {
    list.push(entry);
  }
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<void>} worker
 */
async function mapPool(items, concurrency, worker) {
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      await worker(items[index], index);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
}

/**
 * @returns {Promise<string[]>} paths relative to ROOT to walk
 */
async function resolveScanRoots() {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    console.error("Usage: node upload-to-ipfs.js [subdirectory]");
    process.exit(1);
  }

  const rootReal = await realpath(ROOT);

  if (args.length === 0) {
    const rootEntries = await readdir(ROOT, { withFileTypes: true });
    console.log(`Uploading under: ${rootReal}`);
    return rootEntries.filter((e) => e.isDirectory()).map((e) => e.name);
  }

  let sub = args[0];
  if (sub.startsWith("./")) sub = sub.slice(2);
  if (sub.endsWith("/")) sub = sub.slice(0, -1);

  const targetDir = path.join(ROOT, sub);

  let targetStat;
  try {
    targetStat = await stat(targetDir);
  } catch {
    console.error(`Not a directory: ${targetDir}`);
    process.exit(1);
  }
  if (!targetStat.isDirectory()) {
    console.error(`Not a directory: ${targetDir}`);
    process.exit(1);
  }

  const targetReal = await realpath(targetDir);
  if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${path.sep}`)) {
    console.error(`Path escapes submissions directory: ${args[0]}`);
    process.exit(1);
  }

  console.log(`Uploading under: ${targetReal}`);
  return [path.relative(ROOT, targetDir).split(path.sep).join("/")];
}

async function main() {
  const scanRoots = await resolveScanRoots();

  /** @type {string[]} */
  const candidates = [];
  for (const scanRoot of scanRoots) {
    const files = await walkFiles(path.join(ROOT, scanRoot));
    candidates.push(...files);
  }

  /** @type {string[]} */
  const toUpload = [];
  /** @type {string[]} */
  const ignored = [];

  for (const absolutePath of candidates) {
    const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join("/");
    const baseName = path.basename(relativePath);

    if (SKIP_ROOT_NAMES.has(baseName) && !relativePath.includes("/")) {
      continue;
    }

    // Skip Windows Zone.Identifier ADS leftovers
    if (baseName.endsWith(":Zone.Identifier") || relativePath.includes(":Zone.Identifier")) {
      ignored.push(relativePath);
      continue;
    }

    const ext = getExtension(relativePath);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      ignored.push(relativePath);
      continue;
    }

    toUpload.push(absolutePath);
  }

  await writeFile(
    IGNORED_LOG_PATH,
    ignored.length
      ? `${ignored.join("\n")}\n`
      : "# No ignored files\n",
    "utf8",
  );
  console.log(`Ignored ${ignored.length} file(s) → ${path.relative(process.cwd(), IGNORED_LOG_PATH)}`);

  const manifest = await loadManifest();
  let uploaded = 0;
  let skipped = 0;
  /** @type {string[]} */
  const failedLines = [];

  const pending = [];
  for (const absolutePath of toUpload) {
    const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join("/");
    if (findExistingIpfsPath(manifest, relativePath)) {
      skipped++;
      continue;
    }
    pending.push(absolutePath);
  }

  console.log(`Uploading ${pending.length} file(s) (${skipped} already in manifest, ${toUpload.length} eligible)...`);

  await mapPool(pending, CONCURRENCY, async (absolutePath, index) => {
    const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join("/");
    const { market, submissionId } = parseMarketSubmission(relativePath);
    const name = path.basename(relativePath);
    const ipfsFileName = toIpfsFileName(relativePath);

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const buffer = await readFile(absolutePath);
        const ipfsPath = await ipfsPublish(ipfsFileName, buffer);

        upsertManifestEntry(manifest, market, submissionId, {
          name,
          localPath: relativePath,
          ipfsPath,
        });
        uploaded++;
        console.log(`[${index + 1}/${pending.length}] OK  ${relativePath} → ${ipfsPath}`);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt < maxAttempts) {
          const delayMs = 1000 * attempt;
          console.warn(
            `[${index + 1}/${pending.length}] retry ${attempt}/${maxAttempts} ${relativePath} (${delayMs}ms)`,
            message,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        failedLines.push(`${relativePath}\t${message}`);
        console.error(`[${index + 1}/${pending.length}] FAIL ${relativePath}`, err);
      }
    }
  });

  // Ensure skipped existing entries remain grouped (rebuild from scan + existing)
  for (const absolutePath of toUpload) {
    const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join("/");
    const existing = findExistingIpfsPath(manifest, relativePath);
    if (!existing) continue;
    const { market, submissionId } = parseMarketSubmission(relativePath);
    upsertManifestEntry(manifest, market, submissionId, {
      name: path.basename(relativePath),
      localPath: relativePath,
      ipfsPath: existing,
    });
  }

  // Sort files within each submission for stable output
  for (const market of Object.keys(manifest.markets)) {
    for (const submissionId of Object.keys(manifest.markets[market])) {
      manifest.markets[market][submissionId].sort((a, b) => a.localPath.localeCompare(b.localPath));
    }
  }

  manifest.generatedAt = new Date().toISOString();
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  await writeFile(
    FAILED_LOG_PATH,
    failedLines.length ? `${failedLines.join("\n")}\n` : "# No failed uploads\n",
    "utf8",
  );

  console.log(
    `Done. uploaded=${uploaded} skipped=${skipped} failed=${failedLines.length} ignored=${ignored.length}`,
  );
  console.log(`Manifest → ${path.relative(process.cwd(), MANIFEST_PATH)}`);
  if (failedLines.length) {
    console.log(`Failed → ${path.relative(process.cwd(), FAILED_LOG_PATH)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
