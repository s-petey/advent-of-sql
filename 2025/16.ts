// Advent of SQL 2025 - Day 16

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

// Get the stewards a list of all the passengers and the cocoa car(s)
//  they can be served from that has at least one of their favorite mixins.

// Remember only the top three most-stocked cocoa cars remained operational,
//  so the passengers must be served from one of those cars

// CREATE TABLE passengers (
//     passenger_id INT PRIMARY KEY,
//     passenger_name TEXT,
//     favorite_mixins TEXT[],
//     car_id INT
// );

// CREATE TABLE cocoa_cars (
//     car_id INT PRIMARY KEY,
//     available_mixins TEXT[],
//     total_stock INT
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  SELECT
    passenger_name,
    ARRAY_AGG(cocoa_cars.car_id) as valid_cars
    -- favorite_mixins,
    -- available_mixins
  FROM passengers
  INNER JOIN cocoa_cars
  ON passengers.favorite_mixins && cocoa_cars.available_mixins
  WHERE cocoa_cars.car_id IN (
    SELECT car_id
    FROM cocoa_cars
    ORDER BY total_stock DESC
    LIMIT 3
  )
  GROUP BY passenger_name
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
