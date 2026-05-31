import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  // AgentMail is a server-only SDK — keep it a runtime node require instead of
  // bundling, so Turbopack doesn't try to resolve its optional @x402/fetch
  // payment dependency at build time.
  serverExternalPackages: ["agentmail"],
  webpack(config) {
    config.module.rules.push({
      test: /\.md/,
      type: "asset/source",
    });
    return config;
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
};

export default withBotId(nextConfig);
