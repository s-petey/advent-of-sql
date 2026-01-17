// Advent of SQL 2025 - Day 17

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

// Generate a report, using the products
// and price_changes tables for leadership
// that returns the product_name, current_price,
//  previous_price, and the difference between
//  the current and previous prices.

// CREATE TABLE products (
//     product_id INT PRIMARY KEY,
//     product_name TEXT
// );

// CREATE TABLE price_changes (
//     id INT PRIMARY KEY,
//     product_id INT,
//     price NUMERIC(10,2),
//     effective_timestamp TIMESTAMP
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  WITH latest AS (
    SELECT product_id,
    price as current_price,
    LEAD(price) OVER w as previous_price,
    ROW_NUMBER() OVER w as rank
    
    FROM price_changes
    WINDOW w as (
      PARTITION BY product_id
      ORDER BY effective_timestamp DESC
    )
    ORDER BY 2 DESC
  )
  
  SELECT
    products.product_name,
    latest.current_price,
    latest.previous_price,
    (latest.current_price - latest.previous_price) as price_change
    -- Need to get current_price and previous_price
  FROM products

  INNER JOIN latest
  ON latest.product_id = products.product_id
  WHERE latest.rank = 1
  ORDER BY products.product_name
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
