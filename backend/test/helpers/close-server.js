const { closeDatabase } = require("../../db/db");
const { waitForRecovery } = require("../../security/recovery");
const { waitForOccurrenceConsolidation } = require("../../server");

function closeHttpServer(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function closeTestServer(server) {
  try {
    await closeHttpServer(server);
  } finally {
    await waitForRecovery();
    await waitForOccurrenceConsolidation();
    await closeDatabase();
  }
}

module.exports = { closeTestServer };
