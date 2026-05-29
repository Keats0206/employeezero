/**
 * Run once to pre-bake a sandbox snapshot with vite + vercel CLI installed.
 * Usage: npx tsx scripts/create-sandbox-snapshot.ts
 *
 * Copy the printed snapshotId into .env.local as SANDBOX_SNAPSHOT_ID=snap_xxx
 */

import { Sandbox } from "@vercel/sandbox";

async function main() {
  console.log("Creating sandbox…");
  const sandbox = await Sandbox.create({
    runtime: "node22",
    timeout: 300_000,
  });

  console.log("Installing vite, tailwindcss, and vercel CLI globally…");
  await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", "vite", "vercel", "tailwindcss", "@tailwindcss/vite"],
  });

  console.log("Verifying installs…");
  const viteCheck = await sandbox.runCommand({ cmd: "vite", args: ["--version"] });
  console.log("  vite:", await viteCheck.stdout());

  const vercelCheck = await sandbox.runCommand({ cmd: "vercel", args: ["--version"] });
  console.log("  vercel:", await vercelCheck.stdout());

  console.log("Taking snapshot…");
  const snapshot = await sandbox.snapshot();

  console.log("\n✅ Snapshot created!");
  console.log(`\nSnapshotId: ${snapshot.snapshotId}`);
  console.log("\nAdd this to .env.local:");
  console.log(`SANDBOX_SNAPSHOT_ID=${snapshot.snapshotId}`);

  await sandbox.stop();
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
