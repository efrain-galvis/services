import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { DEFAULT_SITE_AGENT_URL } from "./src/config";

function cspConnectSources(mode: string): Plugin {
  const env = loadEnv(mode, ".", "VITE_");
  const configuredUrls = [
    env.VITE_SITE_AGENT_URL || DEFAULT_SITE_AGENT_URL,
    env.VITE_COPILOTKIT_RUNTIME_URL,
  ].filter(Boolean);
  const origins = new Set(["'self'"]);

  for (const configuredUrl of configuredUrls) {
    if (configuredUrl.startsWith("/") && !configuredUrl.startsWith("//")) {
      continue;
    }

    let url: URL;
    try {
      url = new URL(configuredUrl);
    } catch {
      throw new Error(
        `CSP connect URL must be absolute, including scheme: ${configuredUrl}`,
      );
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`CSP connect URL must use HTTP(S): ${configuredUrl}`);
    }
    origins.add(url.origin);
  }

  return {
    name: "lyra-csp-connect-sources",
    transformIndexHtml(html) {
      return html.replace("__LYRA_CONNECT_SRC__", [...origins].join(" "));
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    root: "src",
    envDir: "..",
    publicDir: "../public",
    plugins: [react(), cspConnectSources(mode)],
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      assetsDir: "assets/build",
    },
  };
});
