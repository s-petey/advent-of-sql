// Advent of SQL 2025 - Day 23

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

// Find all the possible routes from Jake's
// Lift to Maverick. None of the possible
// routes will take more than 12 connections.

// CREATE TABLE mountain_network (
//     id INTEGER PRIMARY KEY,
//     from_node TEXT,
//     to_node TEXT,
//     node_type TEXT,    -- 'Lift' or 'Trail'
//     difficulty TEXT    -- Only applicable for trails: 'green', 'blue', 'black', 'double_black'
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  WITH RECURSIVE mountain_path AS (
    SELECT 
      'Jake''s Lift' AS current_node,
      1 AS segment_count,
      'Jake''s Lift' AS path
    UNION ALL
      SELECT 
        mountain_network.to_node,
        mountain_path.segment_count + 1,
        mountain_path.path || ' -> ' || mountain_network.to_node
      FROM mountain_path
      JOIN mountain_network ON mountain_network.from_node = mountain_path.current_node
      WHERE mountain_path.segment_count < 12
      AND mountain_path.path NOT LIKE '%' || mountain_network.to_node || '%'
  )

  SELECT * 
  FROM mountain_path
  WHERE current_node = 'Maverick'
  `;
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
