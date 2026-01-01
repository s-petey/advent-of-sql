// Advent of SQL 2025 - Day 15

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

// Challenge: Generate a report that returns the dates and families
// that have no delivery assigned after December 14th, using the
// families and deliveries_assigned.

// Each row in the report should be a date and family name that represents
// the dates in which families don't have a delivery assigned yet.

// Label the columns as unassigned_date and name. Order the results by
// unassigned_date and name, respectively, both in ascending order.

//
// CREATE TABLE families (
//     id INT PRIMARY KEY,
//     family_name TEXT
// );

// CREATE TABLE deliveries_assigned (
//     id INT PRIMARY KEY,
//     family_id INT,
//     gift_date DATE,
//     gift_name TEXT
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  WITH dates as (SELECT GENERATE_SERIES(
    '12-15-2025'::date,
    '12-31-2025'::date,
    interval '1 day'
  )::date as date),

  full_matrix as (
    SELECT
    date, 
    families.id family_id,
    family_name
    from dates
    CROSS JOIN families
  )

  SELECT 
    date as unassigned_date,
    family_name as name
  FROM full_matrix 
  LEFT JOIN deliveries_assigned
  ON deliveries_assigned.gift_date = full_matrix.date
  AND deliveries_assigned.family_id = full_matrix.family_id
  WHERE deliveries_assigned.gift_date IS NULL
  ORDER BY unassigned_date ASC, name ASC
  `;
  console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
