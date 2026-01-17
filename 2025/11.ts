// Advent of SQL 2025 - Day 11

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

// Challenge: Using the snowball_inventory and snowball_categories tables,
//  write a query that returns valid snowball categories with the count of
//  valid snowballs per category. Your final table should have the columns
// official_category and total_usable_snowballs. Sort the output from fewest
// to most total_usable_snowballs.

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`SELECT 
  official_category,
  sum(quantity) AS total_snowballs
  FROM snowball_categories
  LEFT JOIN snowball_inventory
  ON snowball_categories.official_category = snowball_inventory.category_name
  AND quantity > 0
  GROUP BY 1
  ORDER BY 2 ASC`;
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
