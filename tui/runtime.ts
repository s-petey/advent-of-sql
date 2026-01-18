import { Effect, Layer, ManagedRuntime, Runtime } from "effect";
import { Path, FileSystem } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { SQL } from "bun";
import { sqlTemplate, template } from "./template";
import {
  CliTools,
  DayExecutionError,
  DayFileNotFoundError,
  DatabaseResetError,
  SqlConnectionError,
  makeCliToolsLive,
} from "./runtime.core";

const PG_CONNECTION = "postgres://postgres:postgres@localhost:5432/postgres";

const checkPostgresConnection = Effect.tryPromise({
  try: async () => {
    const pg = new SQL(PG_CONNECTION);
    await pg`SELECT 1`;
    await pg.close();
    return true;
  },
  catch: () => new SqlConnectionError(),
});

const CliToolsLive = Layer.effect(
  CliTools,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const core = makeCliToolsLive(fs, path, template, sqlTemplate);

    return {
      ...core,

      runDayFile: ({ day, year }: { day: number; year: number }) =>
        Effect.gen(function* () {
          const cwd = path.resolve();
          const dayFilePath = path.join(cwd, year.toString(), `${day}.ts`);

          const fileExists = yield* fs.exists(dayFilePath);
          if (!fileExists) {
            return yield* new DayFileNotFoundError({
              path: `${year}/${day}.ts`,
            });
          }

          const module = yield* Effect.tryPromise({
            try: async () => {
              return await import(`${dayFilePath}?update=${Date.now()}`);
            },
            catch: (error) =>
              new DayExecutionError({
                message: `Failed to import ${year}/${day}.ts: ${error}`,
              }),
          });

          if (!module.default || !Effect.isEffect(module.default)) {
            return yield* new DayExecutionError({
              message: `${year}/${day}.ts does not export a default Effect`,
            });
          }

          const runtime = yield* Effect.runtime<never>();
          const runPromise = Runtime.runPromise(runtime);

          const result = yield* Effect.tryPromise({
            try: () => runPromise(module.default),
            catch: (error) =>
              new DayExecutionError({
                message: `Failed to run ${year}/${day}.ts: ${error}`,
              }),
          });

          const tableData: Record<string, unknown>[] = Array.isArray(result)
            ? (result as Record<string, unknown>[])
            : typeof result === "object" && result !== null
              ? [result as Record<string, unknown>]
              : [];

          return tableData;
        }),

      resetDatabase: ({ day, year }: { day: number; year: number }) =>
        Effect.gen(function* () {
          const cwd = path.resolve();
          const sqlFilePath = path.join(cwd, year.toString(), `${day}.sql`);

          yield* checkPostgresConnection;

          const fileExists = yield* fs.exists(sqlFilePath);

          if (!fileExists) {
            return yield* new DatabaseResetError({
              message: `No SQL reset file found: ${year}/${day}.sql`,
            });
          }

          const sqlContent = yield* fs.readFileString(sqlFilePath);

          yield* Effect.tryPromise({
            try: async () => {
              const pg = new SQL(PG_CONNECTION);
              await pg.unsafe(sqlContent);
              await pg.close();
            },
            catch: (error) =>
              new DatabaseResetError({
                message: `Failed to execute SQL: ${error}`,
              }),
          });

          return "Database reset successful" as const;
        }),
    };
  }),
);

const MainLayer = Layer.provideMerge(CliToolsLive, BunContext.layer);

export const cliRuntime = ManagedRuntime.make(MainLayer);
