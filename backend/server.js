const app = require("./app");
const { closeDatabase, connectDatabase } = require("./db/db");
const { readConfig } = require("./config");
const { smtpConfig, waitForRecovery } = require("./security/recovery");
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
function startOccurrenceTimer() {
  if (occurrenceTimer) return;
  occurrenceTimer = setInterval(() => {
    void runOccurrenceConsolidation();
  }, 60000);
  occurrenceTimer.unref();
}
async function stopOccurrenceTimer() {
  if (occurrenceTimer) {
    clearInterval(occurrenceTimer);
    occurrenceTimer = null;
  }
  if (occurrenceRun) await occurrenceRun;
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
      startOccurrenceTimer();
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
async function stopServer() {
  await stopOccurrenceTimer();
  if (httpServer) {
    const serverToClose = httpServer;
    httpServer = null;
    await new Promise((resolve, reject) => {
      serverToClose.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
  await waitForRecovery();
  await closeDatabase();
}
async function shutdown(signal) {
  console.log(`Chiusura richiesta da ${signal}.`);
  try {
    await stopServer();
    process.exitCode = 0;
  } catch (error) {
    console.error(`Chiusura non riuscita: ${error.message}`);
    process.exitCode = 1;
  }
}
if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Avvio non riuscito: ${error.message}`);
    process.exitCode = 1;
  });
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}
module.exports = {
  app,
  startServer,
  stopServer,
};
