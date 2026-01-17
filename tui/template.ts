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

// Don't need to have this maybe, instead ENV?
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

  // TODO: Implement solution
  console.log("Hello, Advent of SQL ${year} Day ${day}!");

  // Example query:
  // const result = yield* sql\`SELECT * FROM table_name\`;
  // console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
`;
