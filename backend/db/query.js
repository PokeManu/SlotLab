function queries(database) {
  return {
    get: (sql, values = []) =>
      new Promise((resolve, reject) =>
        database.get(sql, values, (error, row) =>
          error ? reject(error) : resolve(row),
        ),
      ),
    all: (sql, values = []) =>
      new Promise((resolve, reject) =>
        database.all(sql, values, (error, rows) =>
          error ? reject(error) : resolve(rows),
        ),
      ),
    run: (sql, values = []) =>
      new Promise((resolve, reject) =>
        database.run(sql, values, function onRun(error) {
          error
            ? reject(error)
            : resolve({ changes: this.changes, lastId: this.lastID });
        }),
      ),
  };
}

module.exports = { queries };
