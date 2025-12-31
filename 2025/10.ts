// Advent of SQL 2025 - Day 10

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

// Challenge?
// “I need to know which toys children are asking for the most.
//  I know there's some issues with spelling or the extra spaces or
//  the funny capitalization, but I just need to know what the children
//  truly meant. Can you help me make a cleaned up list of each toy and
//  how many children want it? Please sort it from the most popular to the least.
//  The elves need to know what to build before it’s too late.”
const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const result = yield* sql`SELECT 
    COUNT(*), 
    LOWER(TRIM(wish_list.raw_wish)) as cleaned_wish 
    FROM wish_list 
    GROUP BY 2
    ORDER BY 1 DESC`;
  console.table(result);
});

program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
