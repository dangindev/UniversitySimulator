import { DatabaseSync } from "node:sqlite";
import { chmod, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const state = "/srv/university-simulator/state";
const database = resolve(state, "data/university.sqlite");
if (await stat(database).catch(() => null)) {
  const backups = resolve(state, "backups");
  await mkdir(backups, { recursive: true, mode: 0o700 });
  const target = resolve(
    backups,
    `university-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.sqlite`,
  );
  const source = new DatabaseSync(database, { readOnly: true });
  try {
    source.prepare("VACUUM INTO ?").run(target);
  } finally {
    source.close();
  }
  await chmod(target, 0o600);
  const snapshot = new DatabaseSync(target, { readOnly: true });
  try {
    if (
      snapshot.prepare("PRAGMA integrity_check").get().integrity_check !== "ok"
    )
      throw new Error("Backup integrity check failed.");
  } finally {
    snapshot.close();
  }
  console.log(`Verified SQLite backup: ${target}`);
} else console.log("Database not initialized; nothing to back up.");
