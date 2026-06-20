const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const packageJson = require(path.resolve(__dirname, "../package.json"));

test("npm test uses shell-independent test discovery", () => {
  const command = packageJson.scripts.test;
  assert.equal(command, "npm run build && node --test tests");
  assert.doesNotMatch(
    command,
    /[*?[\]]/,
    "npm test must not rely on shell glob expansion, which is not portable to Windows"
  );
});
