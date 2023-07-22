const fs = require("fs");
let version = process.argv[process.argv.length - 1];
version = version.split("/").slice(-1)[0].replace(/^v/, "");
console.error(`Patch package.json version to ${version}`);
const packageJson = JSON.parse(fs.readFileSync("package.json").toString());
packageJson.version = version;
fs.writeFileSync("package.json", JSON.stringify(packageJson, undefined, 2) + "\n");
