// Advent of SQL 2025 - Day 21

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

// Using the archive_records table, search both
// the title and description fields for the term "fly".
// Make sure that you also match for words like "flying",
// "flight", etc. Boost the results where the term
// appears in the title and lastly, rank the results
// by relevance (most relevant first). Provide the
// elves the top 5 most relevant archived records back.

// CREATE TABLE archive_records (
//     id INT PRIMARY KEY,
//     title TEXT,
//     description TEXT
// );

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`
  WITH docs AS (
    SELECT
      *,
      SETWEIGHT(TO_TSVECTOR('english', title), 'A')
        || SETWEIGHT(TO_TSVECTOR('english', description), 'B') AS search_vec
    FROM archive_records
  )
  
  SELECT
    id,
    title,
    description,
    TS_RANK(search_vec, TO_TSQUERY('english', 'fly:*')) AS rank
  FROM docs
  WHERE
    search_vec @@ TO_TSQUERY('english', 'fly:*')
  ORDER BY rank DESC
  LIMIT 5
  `;
  console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
