const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slotlab-server-lifecycle-"));
process.env.SLOTLAB_DB_PATH = path.join(directory, "server.sqlite");
process.env.NODE_ENV = "test";
process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.SLOTLAB_JWT_SECRET = crypto.randomBytes(32).toString("hex");

let intervalCallback;
let intervalHandle;
let clearedHandle;
const nativeSetInterval = global.setInterval;
const nativeClearInterval = global.clearInterval;
global.setInterval = (callback) => {
  intervalCallback = callback;
  intervalHandle = { unref() {} };
  return intervalHandle;
};
global.clearInterval = (handle) => {
  clearedHandle = handle;
};

const { startServer } = require("../server");
const { closeTestServer } = require("./helpers/close-server");

test("la chiusura del listener cancella il timer delle occorrenze", async () => {
  let server;
  try {
    server = await startServer();
    assert.equal(typeof intervalCallback, "function");
    await closeTestServer(server);
    assert.equal(clearedHandle, intervalHandle);
    intervalCallback();
  } finally {
    global.setInterval = nativeSetInterval;
    global.clearInterval = nativeClearInterval;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
