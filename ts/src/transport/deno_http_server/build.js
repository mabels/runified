// deno run --allow-run --allow-env --allow-read build.js > deno.js
// deno run --allow-net deno.js

import { build, stop } from "https://deno.land/x/esbuild/mod.js";
import { httpImports } from "https://deno.land/x/esbuild_plugin_http_imports/index.ts";

const { outputFiles } = await build({
  bundle: true,
  entryPoints: ["main.ts"],
  plugins: [httpImports()],
  write: true,
});

//console.log(outputFiles)
//eval(outputFiles)

stop();
