/* Turn generated vibe-widget code (build/out/<name>.jsx) into a self-contained
   iframe page (widgets/<name>.html + widgets/<name>.js) with esbuild.

     VIBE_REPO=/path/to/vibe-widget node build/export.cjs [names...]

   The bundle inlines React, d3 (fetched once from esm.sh at build time and
   cached), the twind helpers and the data, so the deck runs with no network. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "build", "out");
const WIDGETS = path.join(ROOT, "widgets");
const CACHE = path.join(ROOT, "build", ".httpcache");
const REPO = process.env.VIBE_REPO || path.resolve(ROOT, "..", "..", "..", "..", "..", "..", "Users", "dwootton", "Projects", "vibe-widgets-sundai");
const NODE_MODULES = path.join(REPO, "node_modules");
const TWIND_CONFIG = path.join(REPO, "src", "vibe_widget", "AppWrapper", "styles", "twind.config.js");

if (!fs.existsSync(path.join(NODE_MODULES, "esbuild"))) {
  console.error(`esbuild not found under ${NODE_MODULES}; set VIBE_REPO to the vibe-widget checkout`);
  process.exit(1);
}
const esbuild = require(path.join(NODE_MODULES, "esbuild"));
fs.mkdirSync(CACHE, { recursive: true });

const REACT_SPECS = new Set(["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime",
  "react-dom/client", "preact", "preact/compat", "preact/hooks", "scheduler", "react-is"]);
const REACT_URL = /(?:^|\/)(react|react-dom|preact|scheduler|react-is)(?:@[\d.]+)?(?:\/|$)/i;

function isReactSpec(spec) {
  const s = spec.trim();
  if (REACT_SPECS.has(s)) return true;
  if (/^https?:\/\//.test(s)) { try { return REACT_URL.test(new URL(s).pathname); } catch { return false; } }
  return false;
}

/* The host injects React (and tw/css) exactly like SandboxedRunner does. */
function prepareWidgetSource(src) {
  let code = src.replace(/^\s*\/\*__VIBE_BUNDLED__\*\/\s*/, "");
  code = code.replace(/^\s*import\s+(?:[^;]*?from\s+)?['"]([^'"]+)['"]\s*;?\s*$/gm, (m, spec) => (isReactSpec(spec) ? "" : m));
  const usesTw = /\btw\s*[(`]/.test(code) || /\bcss\s*[(`]/.test(code);
  const head = ["import React from \"react\";"];
  if (usesTw) head.push("import { tw, css } from \"./twind.js\";");
  return head.join("\n") + "\n" + code;
}

const httpPlugin = {
  name: "http-loader",
  setup(build) {
    build.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: pinTarget(args.path), namespace: "http-url" }));
    build.onResolve({ filter: /.*/, namespace: "http-url" }, (args) => {
      if (!args.importer) return null;
      try { return { path: new URL(args.path, args.importer).toString(), namespace: "http-url" }; } catch { return null; }
    });
    build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
      const key = crypto.createHash("sha1").update(args.path).digest("hex");
      const cached = path.join(CACHE, key + ".js");
      if (fs.existsSync(cached)) return { contents: fs.readFileSync(cached, "utf8"), loader: "js" };
      const res = await fetch(args.path, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/124.0 Safari/537.36" } });
      if (!res.ok) throw new Error(`fetch ${args.path}: ${res.status}`);
      const contents = await res.text();
      fs.writeFileSync(cached, contents);
      return { contents, loader: "js" };
    });
  },
};
function pinTarget(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "esm.sh" && !u.searchParams.has("target")) u.searchParams.set("target", "es2020");
    return u.toString();
  } catch { return url; }
}

function hostHtml(name, meta) {
  const title = { wait: "What about wait times?", close: "Where is close?", spice: "Do they have pumpkin spice?",
    parameterize: "Query parameterization", structure: "Query structuring", augment: "Query augmentation",
    sel_filter: "Selection filters", sel_highlight: "Selection highlights", sel_count: "Selection constructs",
    in_drag: "Input: drag out", in_corner: "Input: two corners", in_center: "Input: click a center",
    re_none: "Reification: nothing remains", re_move: "Reification: movable", re_handles: "Reification: adjustable" }[name] || name;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../fonts/fonts.css">
<style>
  html, body { margin: 0; height: 100%; background: #f2f0e9; overflow: hidden;
               font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; color: #1a1a1a; }
  #root { width: ${meta.width}px; height: ${meta.height}px; margin: 0 auto; }
</style>
</head>
<body>
<div id="root"></div>
<script src="${name}.js?v=${meta.built || Date.now()}"></script>
</body>
</html>
`;
}

async function exportOne(name) {
  const src = fs.readFileSync(path.join(OUT, `${name}.jsx`), "utf8");
  const meta = JSON.parse(fs.readFileSync(path.join(OUT, `${name}.meta.json`), "utf8"));
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `vw-export-${name}-`));
  fs.writeFileSync(path.join(work, "widget.jsx"), prepareWidgetSource(src));
  fs.writeFileSync(path.join(work, "model.js"), fs.readFileSync(path.join(__dirname, "host", "model.js")));
  fs.writeFileSync(path.join(work, "twind.js"),
    fs.readFileSync(path.join(__dirname, "host", "twind.js"), "utf8").replace("__TWIND_CONFIG__", TWIND_CONFIG));
  fs.copyFileSync(path.join(OUT, "data.json"), path.join(work, "data.json"));
  fs.copyFileSync(path.join(OUT, "inputs.json"), path.join(work, "inputs.json"));
  fs.writeFileSync(path.join(work, "entry.jsx"), `
import React from "react";
import { createRoot } from "react-dom/client";
import { createModel } from "./model.js";
import Widget from "./widget.jsx";
import data from "./data.json";
import inputs from "./inputs.json";
const model = createModel({ data, ...inputs });
createRoot(document.getElementById("root")).render(React.createElement(Widget, { model, React }));
`);
  await esbuild.build({
    entryPoints: [path.join(work, "entry.jsx")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    outfile: path.join(WIDGETS, `${name}.js`),
    nodePaths: [NODE_MODULES],
    logLevel: "warning",
    plugins: [httpPlugin],
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    loader: { ".js": "jsx", ".jsx": "jsx", ".json": "json" },
    minifyWhitespace: true,
    legalComments: "none",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  // stamp the bundle reference so a re-export is never served from a stale
  // browser cache -- the page name does not change, only the bundle behind it
  meta.built = Date.now();
  fs.writeFileSync(path.join(WIDGETS, `${name}.html`), hostHtml(name, meta));
  fs.rmSync(work, { recursive: true, force: true });
  const kb = Math.round(fs.statSync(path.join(WIDGETS, `${name}.js`)).size / 1024);
  console.log(`exported widgets/${name}.html (+${name}.js, ${kb} KB)`);
}

(async () => {
  const names = process.argv.slice(2).length
    ? process.argv.slice(2)
    : fs.readdirSync(OUT)
        // revise_widgets.py keeps the previous version as <name>.prev.jsx; it has
        // no meta of its own and is not a widget the deck embeds.
        .filter((f) => f.endsWith(".jsx") && !f.endsWith(".prev.jsx"))
        .map((f) => f.replace(/\.jsx$/, ""));
  for (const name of names) await exportOne(name);
})().catch((err) => { console.error(err); process.exit(1); });
