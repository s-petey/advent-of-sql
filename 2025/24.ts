// Advent of SQL 2025 - Day 24

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

// Reconstruct the final confirmation phrase
// to text Santa based on the elves’ hazy
// recollection of how they solved this problem before.

// Your final result should include the
// marker_letter for each system, using only
// the most recent dispatch from a primary source.
// Once the correct dispatch has been identified for
// every system, combine the results and order them
// by dispatched_at in ascending order to reveal the
// confirmation phrase.

// CREATE TABLE system_dispatches (
//     id SERIAL PRIMARY KEY,
//     system_id TEXT NOT NULL,
//     dispatched_at TIMESTAMP NOT NULL,
//     payload JSONB NOT NULL,
//     marker_letter TEXT GENERATED ALWAYS AS (payload ->> 'marker') STORED,
//     UNIQUE (system_id, dispatched_at, payload)
// );

// CREATE TABLE incoming_dispatches (
//     system_id TEXT,
//     dispatched_at TIMESTAMP,
//     payload JSONB
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
 --  INSERT INTO 
 --    system_dispatches
 --    (system_id, dispatched_at, payload)
 --  SELECT
 --    system_id,
 --    dispatched_at,
 --    payload
 --  FROM incoming_dispatches
 --  ON CONFLICT (system_id, dispatched_at, payload) DO NOTHING

  WITH ordered_dispatches AS (
    SELECT
      system_id,
      system_dispatches.dispatched_at,
      system_dispatches.marker_letter,
      ROW_NUMBER() OVER (
        PARTITION BY system_id
        ORDER BY dispatched_at DESC
      )
    FROM system_dispatches
    WHERE
      payload ->> 'source' = 'primary'
  )

  SELECT *
  FROM ordered_dispatches
  WHERE row_number = 1
  `;
  console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
