// CLI consumer test — installs @themvora/cli from the published tarball and
// exercises the shipped `themvora` bin as a real external consumer would.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, "node_modules", ".bin", process.platform === "win32" ? "themvora.cmd" : "themvora");
const themeFile = join(here, "theme.json");
const brokenFile = join(here, "broken-theme.json");
const missingFile = join(here, "does-not-exist.json");
const badJson = join(here, "bad-json.json");
const genFile = join(here, "generated.json");

let pass = 0;
let fail = 0;

function run(args, { expectExit = 0, expectOut = [], expectErr = [] } = {}) {
  const label = `themvora ${args.join(" ")}`;
  let code = 0;
  let combined = "";
  try {
    const cmd = `"${bin}" ${args.map((a) => `"${a}"`).join(" ")}`;
    combined = execSync(cmd, { encoding: "utf8" });
  } catch (err) {
    code = err.status;
    combined = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  if (code !== expectExit) {
    fail++;
    console.log(`✗ ${label}: exit ${code}, expected ${expectExit}\n${combined.slice(0, 400)}`);
    return combined;
  }
  for (const needle of expectOut) {
    if (!combined.includes(needle)) {
      fail++;
      console.log(`✗ ${label}: output missing "${needle}"\n---\n${combined.slice(0, 600)}\n---`);
      return combined;
    }
  }
  for (const needle of expectErr) {
    if (!combined.includes(needle)) {
      fail++;
      console.log(`✗ ${label}: error output missing "${needle}"\n---\n${combined.slice(0, 600)}\n---`);
      return combined;
    }
  }
  pass++;
  console.log(`✓ ${label} (exit ${code})`);
  return combined;
}

if (!existsSync(bin)) {
  console.error(`✗ themvora bin not found at ${bin}`);
  process.exit(1);
}

// --- happy path ---
// The published version is read from the installed package rather than pinned
// here: a hardcoded literal goes stale on every release and fails the consumer
// suite for a reason that has nothing to do with the CLI's behaviour.
const installedVersion = JSON.parse(
  readFileSync(join(here, "node_modules", "@themvora", "cli", "package.json"), "utf8"),
).version;
run(["--version"], { expectOut: [installedVersion] });
run(["-v"], { expectOut: [installedVersion] });
run(["--help"], { expectOut: ["Usage:", "generate", "validate"] });
run(["generate", "--seed", "#ea580c", "--mode", "both"], {
  expectOut: ['"light"', '"dark"'],
});
run(["generate", "--mode", "light"], { expectOut: ["light"] });
run(["validate", themeFile], { expectOut: ["Theme is valid"] });
run(["validate", "--file", themeFile], { expectOut: ["Theme is valid"] });
run(["inspect", themeFile], { expectOut: ["forest"] });
run(["export", themeFile, "--format", "css"], { expectOut: ["--theme-color-background"] });
run(["export", themeFile, "--format", "json"], { expectOut: ["background"] });

// --- error paths (non-zero exits) ---
run([], { expectExit: 2 }); // no args → usage error
run(["frobnicate"], { expectExit: 1, expectErr: ["Unknown command"] }); // unknown command → Error
run(["validate", missingFile], { expectExit: 1, expectErr: ["cannot read file"] });
writeFileSync(badJson, "{ not json", "utf8");
run(["validate", badJson], { expectExit: 1, expectErr: ["not valid JSON"] });
run(["validate", brokenFile], { expectExit: 3 }); // missing required tokens
run(["generate", "--seed", "zzzzzz"], { expectExit: 2, expectErr: ["seed must be a hex color"] });
run(["generate", "--mode", "banana"], { expectExit: 2, expectErr: ["invalid mode"] });

// --- generate to a file ---
run(["generate", "--output", genFile], {});
if (existsSync(genFile)) {
  const g = JSON.parse(readFileSync(genFile, "utf8"));
  if (g.light && g.dark) {
    pass++;
    console.log("✓ generate --output writes a { light, dark } pair");
  } else {
    fail++;
    console.log("✗ generate --output shape is wrong");
  }
} else {
  fail++;
  console.log("✗ generate --output did not write the file");
}

console.log(`\nCLI consumer test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
