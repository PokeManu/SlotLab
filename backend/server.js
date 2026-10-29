const app = require("./app");
const { closeDatabase, connectDatabase } = require("./db/db");
const { readConfig } = require("./config");
const { smtpConfig } = require("./security/recovery");
const { cleanDeletedFiles } = require("./security/report-files");
const { transaction } = require("./db/transaction");
const { consolidateOccurrences } = require("./db/occurrences");
let httpServer = null;
let occurrenceTimer = null;
let occurrenceRun = null;
function runOccurrenceConsolidation(suppressErrors = true) {
  if (occurrenceRun) return occurrenceRun;
  occurrenceRun = transaction((db) => consolidateOccurrences(db))
    .catch((error) => {
      if (suppressErrors) {
        console.error(
          `Consolidamento occorrenze non riuscito: ${error.message}`,
        );
        return null;
      }
      throw error;
    })
    .finally(() => {
      occurrenceRun = null;
    });
  return occurrenceRun;
}
function clearOccurrenceTimer() {
  if (!occurrenceTimer) return;
  clearInterval(occurrenceTimer);
  occurrenceTimer = null;
}
function startOccurrenceTimer(server) {
  if (occurrenceTimer) return;
  occurrenceTimer = setInterval(() => {
    if (!httpServer) return;
    void runOccurrenceConsolidation();
  }, 60000);
  occurrenceTimer.unref();
  server.once("close", () => {
    clearOccurrenceTimer();
    if (httpServer === server) httpServer = null;
  });
}
async function stopOccurrenceTimer() {
  clearOccurrenceTimer();
  if (occurrenceRun) await occurrenceRun;
}
function waitForOccurrenceConsolidation() {
  return occurrenceRun || Promise.resolve();
}
async function startServer() {
  if (httpServer) {
    return httpServer;
  }
  const config = readConfig();
  app.set("trust proxy", config.trustProxy);
  smtpConfig();
  await connectDatabase();
  await runOccurrenceConsolidation(false);
  await cleanDeletedFiles();
  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host);
    server.once("listening", () => {
      httpServer = server;
      startOccurrenceTimer(server);
      const address = server.address();
      console.log(`Server in ascolto su ${config.host}, porta ${address.port}`);
      resolve(server);
    });
    server.once("error", async (error) => {
      await stopOccurrenceTimer();
      try {
        await closeDatabase();
      } catch (closeError) {
        console.error(
          `Chiusura del database non riuscita: ${closeError.message}`,
        );
      }
      reject(error);
    });
  });
}
if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Avvio non riuscito: ${error.message}`);
    process.exitCode = 1;
  });
}
module.exports = {
  app,
  startServer,
  waitForOccurrenceConsolidation,
};
