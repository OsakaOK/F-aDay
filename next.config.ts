import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray parent lockfile otherwise
  // makes Next infer the wrong root for build-trace collection).
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
  // PGlite ships a wasm/fs bundle that must not be bundled by webpack on the server.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
