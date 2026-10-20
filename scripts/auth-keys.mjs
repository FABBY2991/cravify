#!/usr/bin/env node
// Generates the RS256 key pair Convex Auth signs sessions with and stores it
// on a Convex deployment — the values go straight to `convex env set` and are
// never printed. Usage: node scripts/auth-keys.mjs [--prod]
import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";

const prod = process.argv.includes("--prod");
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).trimEnd().replace(/\n/g, " ");
const jwks = JSON.stringify({ keys: [{ use: "sig", alg: "RS256", ...publicKey.export({ format: "jwk" }) }] });

for (const [name, value] of [["JWT_PRIVATE_KEY", pem], ["JWKS", jwks]]) {
  const result = spawnSync("npx", ["convex", "env", "set", ...(prod ? ["--prod"] : []), name, "--", value], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  if (result.status !== 0) {
    console.error(`Setting ${name} failed (exit ${result.status}).`);
    process.exit(1);
  }
  console.log(`${name} set on the ${prod ? "production" : "dev"} deployment.`);
}
