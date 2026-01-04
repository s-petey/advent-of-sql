// Advent of SQL 2025 - Day 18

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

// Build a report using the orders table that shows the latest order for each customer,
// along with their requested shipping method, gift wrap choice
// (as true or false), and the risk flag in separate columns.
// Order the report by the most recent order first so Evergreen Market can reach out to them ASAP

// CREATE TABLE orders (
//     id           INT PRIMARY KEY,
//     customer_id  INT,
//     created_at   TIMESTAMP,
//     order_data   JSONB
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  WITH partitioned_orders as (
    SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY orders.created_at DESC
    ) as row_number
    FROM orders
  )

  SELECT
    customer_id,
    CASE
      WHEN order_data -> 'shipping' -> 'method' IS NOT NULL THEN order_data -> 'shipping' ->> 'method'
      ELSE '--'
    END as shipping_method,
    (order_data -> 'gift' -> 'wrapped')::boolean as gift_wrap,
    order_data -> 'risk' ->> 'flag' as risk_flag
    -- CASE
    --   WHEN order_data -> 'risk' ->> 'flag' IS NOT NULL THEN order_data -> 'risk' ->> 'flag'
    --   ELSE '--'
    -- END as risk_flag
  FROM partitioned_orders
  WHERE row_number = 1
  ORDER BY created_at DESC
`;
  console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
