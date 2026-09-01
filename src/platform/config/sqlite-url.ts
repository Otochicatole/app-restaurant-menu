const SQLITE_FILE_PROTOCOL = "file:";

export function assertLocalSqliteUrl(databaseUrl: string): void {
  const value = databaseUrl.trim();
  if (!value.startsWith(SQLITE_FILE_PROTOCOL)) {
    throw new Error("DATABASE_URL must point to a local SQLite file using the file: protocol.");
  }

  const filePath = value.slice(SQLITE_FILE_PROTOCOL.length);
  if (
    filePath.length === 0
    || filePath === ":memory:"
    || filePath.includes("?")
    || filePath.includes("#")
    || filePath.includes("\0")
  ) {
    throw new Error("DATABASE_URL must identify one persistent local SQLite file.");
  }
}
