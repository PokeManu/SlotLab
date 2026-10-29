const sqlite3 = require("sqlite3");
const { getDatabase } = require("./db");
const { queries } = require("./query");
async function transaction(work) {
  const main = await queries(getDatabase()).get("PRAGMA database_list");
  const db = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(
      main.file,
      sqlite3.OPEN_READWRITE,
      (e) => (e ? reject(e) : resolve(connection)),
    );
  });
  const query = queries(db);
  let started = false;
  try {
    await query.run("PRAGMA foreign_keys = ON");
    await query.run("PRAGMA busy_timeout = 5000");
    await query.run("BEGIN IMMEDIATE");
    started = true;
    const result = await work(query);
    await query.run("COMMIT");
    started = false;
    return result;
  } catch (error) {
    if (started) await query.run("ROLLBACK");
    throw error;
  } finally {
    await new Promise((resolve, reject) =>
      db.close((e) => (e ? reject(e) : resolve())),
    );
  }
}
module.exports = { queries, transaction };
