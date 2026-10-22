// Builds the storefront assets: readable source in widget/src, minified output in the
// theme extension's assets (Shopify's app-block JS budget is 10 KB per file).
// Usage: node widget/build.mjs [--watch]
import * as esbuild from "esbuild";

const assets = "extensions/blinc-reviews-theme/assets";
const scripts = [
  ["blinc-reviews.js", "iife"],
  ["blinc-reviews-form.js", "esm"],
  ["blinc-reviews-extras.js", "esm"],
  ["blinc-cards.js", "iife"],
].map(([file, format]) => ({
  entryPoints: [`widget/src/${file}`],
  outfile: `${assets}/${file}`,
  format,
  target: "es2022",
}));
const styles = [
  ["reviews.css", "blinc-reviews.css"],
  ["stars.css", "blinc-stars.css"],
].map(([source, file]) => ({
  entryPoints: [`widget/src/styles/${source}`],
  outfile: `${assets}/${file}`,
}));
const builds = [...scripts, ...styles].map((options) => ({
  ...options,
  bundle: true,
  minify: true,
  legalComments: "none",
}));

if (process.argv.includes("--watch")) {
  for (const options of builds) await (await esbuild.context(options)).watch();
  console.log("[widget] watching widget/src");
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
  console.log("[widget] built");
}
