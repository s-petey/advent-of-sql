// Advent of SQL 2025 - Day 22

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

// Using the travel_manifests table,
// extract the passenger information from
// the XML data and produce a report that
// shows all of the departure times for
// "CARGO" vehicles that have more than
// 20 passengers booked. Include in the results:
// The vehicle_id
// The departure_time
// The total number of passengers on that departure
// Order the results by departure_time.

// CREATE TABLE travel_manifests (
//     manifest_id INT PRIMARY KEY,
//     vehicle_id TEXT,
//     departure_time TIMESTAMP,
//     manifest_xml XML
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  SELECT
    vehicle_id,
    departure_time,
    COUNT(*) as passenger_count
    -- passenger_name
    -- departure_time
    -- XPATH('/manifest/passengers/passenger/name/text()', manifest_xml) AS name
  FROM travel_manifests
  CROSS JOIN LATERAL XMLTABLE(
    '/manifest/passengers/passenger'
    PASSING manifest_xml
    COLUMNS 
      passenger_name TEXT PATH 'name'
  ) as p
  -- SUM (p)
  WHERE vehicle_id ILIKE 'CARGO%'
  GROUP BY vehicle_id, departure_time
  HAVING
  COUNT(*) > 20
  ORDER BY departure_time ASC
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
