/**
 * Crawl the entire Bunny CDN storage zone and save the complete file tree.
 * Output: scripts/bunny-tree.json — array of { path, size, isDir }
 *
 * Usage: cd scripts && npx tsx src/crawl-bunny.ts
 */
import https from "https";
import fs from "fs";

const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD || "25e208b1-2c67-4f2b-ab197790a4b5-27aa-4fa9";
const STORAGE_ZONE = "groovelab-loops";
const STORAGE_HOST = "sg.storage.bunnycdn.com";

interface BunnyItem {
  Guid: string;
  ObjectName: string;
  Path: string;
  IsDirectory: boolean;
  Length: number;
  DateCreated: string;
}

interface FileEntry {
  path: string;     // full path relative to zone root
  size: number;
  isDir: boolean;
}

function listDir(dirPath: string): Promise<BunnyItem[]> {
  // URL-encode each path segment individually
  const encoded = dirPath.split("/").map(s => encodeURIComponent(s)).join("/");
  const url = `/${STORAGE_ZONE}/${encoded}/`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: STORAGE_HOST,
      path: url,
      method: "GET",
      headers: { AccessKey: STORAGE_PASSWORD },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          console.error(`  WARN: ${res.statusCode} for ${dirPath}`);
          resolve([]);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          console.error(`  WARN: bad JSON for ${dirPath}`);
          resolve([]);
        }
      });
    });
    req.on("error", (e) => {
      console.error(`  ERR: ${dirPath} — ${e.message}`);
      resolve([]);
    });
    req.end();
  });
}

async function crawl(dirPath: string, depth: number): Promise<FileEntry[]> {
  const items = await listDir(dirPath);
  const results: FileEntry[] = [];

  for (const item of items) {
    const fullPath = dirPath ? `${dirPath}/${item.ObjectName}` : item.ObjectName;

    if (item.IsDirectory) {
      results.push({ path: fullPath, size: 0, isDir: true });
      // Recurse
      const children = await crawl(fullPath, depth + 1);
      results.push(...children);
    } else {
      results.push({ path: fullPath, size: item.Length, isDir: false });
    }
  }

  if (depth <= 1) {
    const fileCount = results.filter(r => !r.isDir).length;
    console.log(`  ${dirPath || "ROOT"}: ${fileCount} files`);
  }

  return results;
}

async function main() {
  console.log("Crawling Bunny CDN storage zone...");
  console.log(`Zone: ${STORAGE_ZONE} @ ${STORAGE_HOST}`);

  const allEntries = await crawl("", 0);

  const files = allEntries.filter((e) => !e.isDir);
  const dirs = allEntries.filter((e) => e.isDir);
  const wavFiles = files.filter((f) => f.path.toLowerCase().endsWith(".wav"));

  console.log(`\nCrawl complete:`);
  console.log(`  Directories: ${dirs.length}`);
  console.log(`  Total files: ${files.length}`);
  console.log(`  WAV files:   ${wavFiles.length}`);
  console.log(`  Other files: ${files.length - wavFiles.length}`);

  // Save full tree
  const outPath = "/home/runner/workspace/scripts/bunny-tree.json";
  fs.writeFileSync(outPath, JSON.stringify(allEntries, null, 2));
  console.log(`\nSaved to ${outPath}`);

  // Also save a WAV-only flat list for quick reference
  const wavListPath = "/home/runner/workspace/scripts/bunny-wavs.txt";
  fs.writeFileSync(
    wavListPath,
    wavFiles.map((f) => `${f.path}|${f.size}`).join("\n")
  );
  console.log(`WAV list saved to ${wavListPath}`);

  // Show folder structure summary
  console.log(`\nFolder structure (first 3 levels):`);
  const topDirs = dirs.filter(d => d.path.split("/").length <= 3);
  for (const d of topDirs.slice(0, 100)) {
    const indent = "  ".repeat(d.path.split("/").length);
    const childFiles = wavFiles.filter(f => f.path.startsWith(d.path + "/") && f.path.split("/").length === d.path.split("/").length + 1);
    console.log(`${indent}${d.path.split("/").pop()}/ (${childFiles.length} wavs)`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
