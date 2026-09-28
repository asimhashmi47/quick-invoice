const path = require('path');
const os = require('os');
const fs = require('fs');

const dbFile = path.join(
  os.tmpdir(),
  `quickinvoice-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
process.env.DB_PATH = dbFile;
process.env.NODE_ENV = 'test';

afterAll(() => {
  try {
    fs.rmSync(dbFile, { force: true });
    fs.rmSync(`${dbFile}-wal`, { force: true });
    fs.rmSync(`${dbFile}-shm`, { force: true });
  } catch (err) {
    // best-effort cleanup
  }
});
