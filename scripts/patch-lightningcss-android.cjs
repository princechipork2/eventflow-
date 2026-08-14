const fs = require("fs");

if (process.platform !== "android") {
  process.exit(0);
}

const lightningcssEntry = require.resolve("lightningcss");
const indexPath = lightningcssEntry;

let content = fs.readFileSync(indexPath, "utf8");

if (content.includes("process.platform === 'android'")) {
  console.log("Lightning CSS Android fallback already applied.");
  process.exit(0);
}

const start = content.indexOf("if (process.env.CSS_TRANSFORMER_WASM)");

const endMarker = "\n\nmodule.exports.browserslistToTargets";
const end = content.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  console.error(
    "Could not safely patch Lightning CSS. Its loader structure may have changed."
  );
  process.exit(1);
}

const androidBlock = `if (process.env.CSS_TRANSFORMER_WASM || process.platform === 'android') {
  module.exports = require('lightningcss-wasm');
} else {
  try {
    module.exports = require(\`lightningcss-\${parts.join('-')}\`);
  } catch (err) {
    module.exports = require(\`../lightningcss.\${parts.join('-')}.node\`);
  }
}`;

content =
  content.slice(0, start) +
  androidBlock +
  content.slice(end);

fs.writeFileSync(indexPath, content);

console.log("Applied Lightning CSS Android WASM fallback.");
