export const template = ({
  year,
  day,
}: {
  year: number;
  day: number;
}) => `// Advent of SQL ${year} - Day ${day}

import { SqlClient } from "@effect/sql";
import { PgClient } from "@effect/sql-pg";
import { Config, Effect } from "effect";

process.env.db_password = "postgres";

const DatabaseLive = PgClient.layerConfig({
  password: Config.redacted("db_password"),
  username: Config.succeed("postgres"),
  database: Config.succeed("postgres"),
  host: Config.succeed("localhost"),
  port: Config.succeed(5432),
});

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // TODO: Implement your SQL query here
  // Return the result to display in the TUI
  const result = yield* sql\`SELECT 1 as example\`;
  return result;
});

// Export the program for the TUI to run
export default program.pipe(Effect.provide(DatabaseLive));

// Run directly when executed as a script
if (import.meta.main) {
  program.pipe(
    Effect.provide(DatabaseLive),
    Effect.tap((result) => Effect.sync(() => console.table(result))),
    Effect.runPromise,
  );
}
`;

export const sqlTemplate = ({
  year,
  day,
}: {
  year: number;
  day: number;
}) => `-- Advent of SQL ${year} - Day ${day}
-- Database Reset Script

`;
