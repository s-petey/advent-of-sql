// Advent of SQL 2025 - Day 12

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

// Challenge: Using the hotline_messages table, update any record that has "sorry"
//  (case insensitive) in the transcript and doesn't currently have a status assigned
//  to have a status of "approved".

// Then delete any records where the tag is "penguin prank", "time-loop advisory",
//  "possible dragon", or "nonsense alert" or if the caller's name is "Test Caller".

// After updating and deleting the records as described, write a final query
// that returns how many messages currently have a status of "approved" and
// how many still need to be reviewed (i.e., status is NULL).

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const anySorryCount = yield* sql<{ count: number }>`
    SELECT COUNT(*) AS count
    FROM hotline_messages
    WHERE LOWER(transcript) LIKE '%sorry%'
    AND status IS NULL
  `;
  console.log(`Records with 'sorry' in transcript: ${anySorryCount[0]?.count}`);

  if ((anySorryCount[0]?.count ?? 0) > 0) {
    yield* sql`
      UPDATE hotline_messages
      SET status = 'approved'
      WHERE LOWER(transcript) LIKE '%sorry%'
      AND status IS NULL
    `;
    console.log(`Updated records with 'sorry' to status 'approved'.`);
  }

  const deleteResult = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM hotline_messages
    WHERE tag IN ('penguin prank', 'time-loop advisory', 'possible dragon', 'nonsense alert')
    OR caller_name = 'Test Caller'
  `;
  console.log(`Records to delete ${deleteResult[0]?.count}`);

  if ((deleteResult[0]?.count ?? 0) > 0) {
    yield* sql`
      DELETE FROM hotline_messages
      WHERE tag IN ('penguin prank', 'time-loop advisory', 'possible dragon', 'nonsense alert')
      OR caller_name = 'Test Caller'
    `;
    console.log(`Deleted records with specified tags or caller name.`);
  }

  // Example query:
  const result = yield* sql`SELECT
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE status IS NULL) AS needs_review_count
    FROM hotline_messages
  `;
  // sql`SELECT
  //   COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved_count,
  //   COUNT(CASE WHEN status IS NULL THEN 1 END) AS needs_review_count
  // FROM hotline_messages`;
  console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
