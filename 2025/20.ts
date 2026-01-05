// Advent of SQL 2025 - Day 20

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

// Challenge:
// Calculate the 7-day rolling average behavior score for each child.
// Identify any child whose rolling average drops below 0.
// For those children with a rolling average below 0, return the
// child_id, child_name, behavior_date (this will be the latest date
// in the 7-day rolling average), and the calculated 7-day rolling
// average. Only include results with a behavior_date of December 7,
// 2025 or later, ensuring that each rolling average is based on a full
// 7 days of data.
// Order the results by behavior_date and then child_name.

// CREATE TABLE behavior_logs (
//     id INT PRIMARY KEY,
//     child_id INT,
//     child_name TEXT,
//     behavior_date DATE,
//     score INT
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  WITH grouped_results AS (
    SELECT 
      child_id,
      child_name,
      behavior_date,
      AVG(score) OVER w AS score_avg
    FROM behavior_logs
    WINDOW w AS (
      PARTITION BY child_id
      ORDER BY behavior_date ASC
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )
  )
  
  SELECT *
  FROM grouped_results
  WHERE behavior_date > '12-07-2025'
  AND score_avg < 0
  ORDER BY behavior_date ASC, child_name ASC
  `;
  console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
