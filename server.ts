import { serve } from "bun";

// Билдим React в память/папку public
const build = await Bun.build({
  entrypoints: ["./src/main.tsx"],
  outdir: "./public",
  minify: true,
});

if (!build.success) console.error("Build failed", build.logs);

serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/main.js") return new Response(Bun.file("./public/main.js"));
    return new Response(Bun.file("./index.html"));
  },
});

console.log("💎 Xray GUI running: http://localhost:3000");