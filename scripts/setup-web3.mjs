#!/usr/bin/env node
/**
 * One-command Web3 setup:
 *   1. Install contracts/node_modules if missing
 *   2. Start Ganache on port 7545 if not already running
 *   3. Deploy Escrow contract
 *   4. Write NEXT_PUBLIC_ESCROW_ADDRESS into .env.local
 */

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createConnection } from "net";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT          = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACTS_DIR = join(ROOT, "contracts");
const ENV_FILE      = join(ROOT, ".env.local");
const GANACHE_PORT  = 7545;

// Private key that hardhat.config.ts uses as the deployer account.
// Ganache is seeded with this key so it has ETH to pay gas.
const DEPLOYER_KEY = "0x5e2dc86630cbd74453e7a2aef970873cd7aa7a728a4c873fa5253a710cac23fc";

const ok   = (msg) => console.log(`\n✅  ${msg}`);
const info = (msg) => console.log(`   ${msg}`);
const fail = (msg) => { console.error(`\n❌  ${msg}`); process.exit(1); };

// ── helpers ──────────────────────────────────────────────────────────────────

function isPortOpen(port) {
  return new Promise((resolve) => {
    const s = createConnection(port, "127.0.0.1");
    s.setTimeout(1000);
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("error",   () => resolve(false));
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });
}

async function waitForPort(port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀  LogoDesignHub — Web3 Setup\n" + "─".repeat(40));

  // 1. Install contracts dependencies
  if (!existsSync(join(CONTRACTS_DIR, "node_modules"))) {
    info("Installing contracts/node_modules...");
    execSync("npm install", { cwd: CONTRACTS_DIR, stdio: "inherit" });
    ok("Contracts dependencies installed");
  } else {
    ok("Contracts dependencies already present");
  }

  // 2. Check / start Ganache
  if (await isPortOpen(GANACHE_PORT)) {
    ok(`Ganache already running on port ${GANACHE_PORT}`);
  } else {
    info("Ganache not detected — starting via npx ganache...");
    const ganache = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      [
        "ganache",
        "--port",          String(GANACHE_PORT),
        "--chain.chainId", "1337",
        `--account=${DEPLOYER_KEY},1000000000000000000000`,
        "--quiet",
      ],
      { cwd: ROOT, detached: true, stdio: "pipe" }
    );
    ganache.unref();

    ganache.stderr.on("data", (d) => {
      const msg = d.toString().trim();
      if (msg) process.stderr.write("   ganache: " + msg + "\n");
    });

    const ready = await waitForPort(GANACHE_PORT, 25_000);
    if (!ready) fail("Ganache failed to start within 25 s.\nTry: npm install -g ganache");
    ok(`Ganache started on port ${GANACHE_PORT}`);
  }

  // 3. Deploy contract
  info("Deploying Escrow contract to Ganache...");
  let output;
  try {
    output = execSync(
      "npx hardhat run scripts/deploy.ts --network ganache",
      { cwd: CONTRACTS_DIR, encoding: "utf8" }
    );
    process.stdout.write(output);
  } catch (e) {
    fail("Deployment failed:\n" + (e.stdout ?? "") + "\n" + e.message);
  }

  // 4. Extract deployed address
  const match = output.match(/NEXT_PUBLIC_ESCROW_ADDRESS=(0x[0-9a-fA-F]{40})/);
  if (!match) fail("Could not parse contract address from deploy output.");
  const address = match[1];
  ok(`Contract deployed at ${address}`);

  // 5. Write address into .env.local
  if (!existsSync(ENV_FILE)) {
    fail(".env.local not found — copy .env.example to .env.local and fill in Supabase keys first.");
  }

  let env = readFileSync(ENV_FILE, "utf8");
  env = env.includes("NEXT_PUBLIC_ESCROW_ADDRESS=")
    ? env.replace(/NEXT_PUBLIC_ESCROW_ADDRESS=.+/m, `NEXT_PUBLIC_ESCROW_ADDRESS=${address}`)
    : env.trimEnd() + `\nNEXT_PUBLIC_ESCROW_ADDRESS=${address}\n`;
  writeFileSync(ENV_FILE, env, "utf8");
  ok(".env.local updated with new contract address");

  console.log("\n🎉  Setup complete! Start the app with: npm run dev\n");
}

main().catch((e) => fail(e.message));
