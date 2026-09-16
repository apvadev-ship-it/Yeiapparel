import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  // Expone las variables VITE_* al cliente (Supabase, etc.).
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define = Object.fromEntries(
    Object.entries(env).map(([k, v]) => [
      `import.meta.env.${k}`,
      JSON.stringify(v),
    ]),
  );

  return {
    define,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      // Una sola copia de React y de TanStack Query en el bundle.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    server: { host: "::", port: Number(process.env.PORT) || 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      // Redirige la entrada del servidor de TanStack Start a src/server.ts.
      // `inlineCss`: el CSS (21.8 KiB tras las optimizaciones de esta
      // sesión) se embebe como <style> en el <head> en vez de un
      // <link rel="stylesheet"> que bloquea el render con una solicitud
      // de red aparte. Ya se probó antes con el CSS sin optimizar
      // (~130 KiB) y empeoró el TBT sin ayudar al FCP; con este tamaño
      // mucho menor vale la pena remedirlo.
      tanstackStart({
        server: { entry: "server", build: { inlineCss: true } },
      }),
      nitro({ preset: "cloudflare-module" }),
      viteReact(),
    ],
  };
});
