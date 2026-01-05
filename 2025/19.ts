// Advent of SQL 2025 - Day 19

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

// Clean-up the deliveries table to remove any records where
// the delivery_location is 'Volcano Rim', 'Drifting Igloo',
// 'Abandoned Lighthouse', 'The Vibes'.

// Move those records to the misdelivered_presents with all
// the same columns as deliveries plus a flagged_at column
// with the current time and a reason column with
// "Invalid delivery location" listed as the reason for each moved record.

// Make sure your final step shows the misdelivered_presents
// records that you just moved (i.e. don't include any existing
// records from the misdelivered_presents table).

//  --
// CREATE TABLE deliveries (
//     id INT PRIMARY KEY,
//     child_name TEXT,
//     delivery_location TEXT,
//     gift_name TEXT,
//     scheduled_at TIMESTAMP
// );

// CREATE TABLE misdelivered_presents (
//     id INT PRIMARY KEY,
//     child_name TEXT,
//     delivery_location TEXT,
//     gift_name TEXT,
//     scheduled_at TIMESTAMP,
//     flagged_at TIMESTAMP,
//     reason TEXT
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  INSERT INTO misdelivered_presents
  SELECT
    -- nextval(pg_get_serial_sequence('misdelivered_presents', 'id')) as id,
    id,
    child_name,
    delivery_location,
    gift_name,
    scheduled_at,
    NOW() as flagged_at,
    'Invalid delivery location' as reason
   FROM deliveries
  WHERE delivery_location IN ('Volcano Rim','Drifting Igloo', 'Abandoned Lighthouse', 'The Vibes')
  `;
  console.table(result);
  const result2 = yield* sql`SELECT *
   FROM misdelivered_presents
  --WHERE flagged_at > '2026-01-01'
  ORDER BY flagged_at DESC`;
  console.table(result2);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
