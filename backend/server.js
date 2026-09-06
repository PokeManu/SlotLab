const app = require('./app');
const { closeDatabase, connectDatabase } = require('./db/db');
const { readConfig } = require('./config');

let httpServer = null;

async function startServer() {
  if (httpServer) {
    return httpServer;
  }

  const config = readConfig();
  await connectDatabase();

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host);

    server.once('listening', () => {
      httpServer = server;
      const address = server.address();
      console.log(`Server in ascolto su ${config.host}, porta ${address.port}`);
      resolve(server);
    });

    server.once('error', async (error) => {
      try {
        await closeDatabase();
      } catch (closeError) {
        console.error(`Chiusura del database non riuscita: ${closeError.message}`);
      }

      reject(error);
    });
  });
}

async function stopServer() {
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

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = {
  app,
  startServer,
  stopServer,
};
