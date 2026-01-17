// Advent of SQL 2025 - Day 13

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

// Jordan's spreadsheet used:

// Different task labels (e.g., "stage setup", "choir", "cocoa station", "parking_support")
// Inconsistent time formats ("10AM", "10 am", "noon", "2 PM")
// Two brand-new roles he invented on the spot due to the storm: snow shoveling and handwarmer handout

// Meanwhile, John's official system stored:
// Job titles in standardized machine-friendly form (stage_setup, cocoa_station, etc.)
// Timeslots in strict "HH:MM AM/PM" format
// Extra columns Jordan never included, such as age_group and an unused code field

// Using the official_shifts and last_minute_signups tables, create a combined de-duplicated volunteer list.

// Ensure the list has standardized role labels of Stage Setup, Cocoa Station, Parking Support, Choir Assistant, Snow Shoveling, Handwarmer Handout.

// Make sure that the timeslot formats follow John's official shifts format.

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql<{
    role: string;
    combined_roles: string;
  }>`SELECT
  volunteer_name,
    CASE
      WHEN role ILIKE '%stage%' THEN 'Stage Setup'
      WHEN role ILIKE '%cocoa%' THEN 'Cocoa Station'
      WHEN role ILIKE '%parking%' THEN 'Parking Support'
      WHEN role ILIKE '%choir%' THEN 'Choir Assistant'
      WHEN role ILIKE '%shovel%' THEN 'Snow Shoveling'
      WHEN role ILIKE '%handwarmer%' THEN 'Handwarmer Handout'
      ELSE 'Other'
    END as role,
    CASE
    WHEN shift_time ILIKE '2:00 PM' THEN '02:00 PM'
    ELSE shift_time
    END as start_time
  FROM official_shifts
  UNION
  SELECT
  volunteer_name,
    CASE
      WHEN assigned_task ILIKE '%stage%' THEN 'Stage Setup'
      WHEN assigned_task ILIKE '%cocoa%' THEN 'Cocoa Station'
      WHEN assigned_task ILIKE '%parking%' THEN 'Parking Support'
      WHEN assigned_task ILIKE '%choir%' THEN 'Choir Assistant'
      WHEN assigned_task ILIKE '%shovel%' THEN 'Snow Shoveling'
      WHEN assigned_task ILIKE '%handwarmer%' THEN 'Handwarmer Handout'
      ELSE assigned_task
    END as role,
    CASE 
      WHEN time_slot ILIKE '%noon%' THEN '12:00 PM'
      WHEN time_slot ILIKE '10 am%' THEN '10:00 AM'
      WHEN time_slot ILIKE '10AM%' THEN '10:00 AM'
      WHEN time_slot ILIKE '2 PM%' THEN '02:00 PM'
      ELSE time_slot
    END as start_time
  FROM last_minute_signups
  ORDER BY volunteer_name
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
