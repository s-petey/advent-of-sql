// Advent of SQL 2025 - Day 14

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

// Challenge: Write a query that returns the top 3 artists per user. Order the results by the most played.

// CREATE TABLE listening_logs (
//     id INTEGER PRIMARY KEY,
//     user_name TEXT,
//     artist TEXT,
//     played_at TIMESTAMP,
//     content_type TEXT
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Using window functions
  const result = yield* sql`SELECT * FROM (
    SELECT
      user_name,
      artist, 
      count(*) as play_count, 
      ROW_NUMBER() OVER (
        PARTITION BY user_name
        ORDER BY count(*) desc, artist ASC
      ) as rank
      
      FROM listening_logs
      GROUP BY user_name, artist
      ORDER BY user_name, 3 DESC
    )
    WHERE rank <= 3
  `;

  console.table(result);

  // Using CTE function
  const result2 = yield* sql`WITH ranked AS (
    SELECT
      user_name,
      artist, 
      count(*) as play_count, 
      ROW_NUMBER() OVER (
        PARTITION BY user_name
        ORDER BY count(*) desc, artist ASC
      ) as rank
      
      FROM listening_logs
      GROUP BY user_name, artist
      ORDER BY user_name, 3 DESC
    )

    SELECT * from ranked
    WHERE rank <= 3
  `;

  return result2;
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
