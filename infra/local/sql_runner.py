import json
import pathlib
import sqlite3
import sys

database = sqlite3.connect(":memory:")
database.executescript(sys.stdin.read(65536))
database.set_authorizer(lambda action, arg1, arg2, name, source: sqlite3.SQLITE_DENY if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH) else sqlite3.SQLITE_OK)
query = pathlib.Path("/work/main.sql").read_text(encoding="utf-8")
cursor = database.execute(query)
rows = cursor.fetchmany(1001)
if len(rows) > 1000:
    raise RuntimeError("Query result limit exceeded")
print(json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
