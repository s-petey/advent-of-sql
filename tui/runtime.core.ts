import { Effect, Either, Schema, Context } from "effect";
import type { PlatformError } from "@effect/platform/Error";
import { Path, FileSystem } from "@effect/platform";

export class FileExistsError extends Schema.TaggedError<FileExistsError>()("FileExistsError", {
  path: Schema.String,
}) {}

export class FileCreationError extends Schema.TaggedError<FileCreationError>()(
  "FileCreationError",
  {
    message: Schema.String,
  },
) {}

export class DayFileNotFoundError extends Schema.TaggedError<DayFileNotFoundError>()(
  "DayFileNotFoundError",
  {
    path: Schema.String,
  },
) {}

export class DayExecutionError extends Schema.TaggedError<DayExecutionError>()(
  "DayExecutionError",
  {
    message: Schema.String,
  },
) {}

export class DatabaseResetError extends Schema.TaggedError<DatabaseResetError>()(
  "DatabaseResetError",
  {
    message: Schema.String,
  },
) {}

export class SqlConnectionError extends Schema.TaggedError<SqlConnectionError>()(
  "SqlConnectionError",
  {},
) {}

export interface CliToolsService {
  listAvailableDays: (
    year: number,
  ) => Effect.Effect<Array<{ day: number; year: number }>, PlatformError, never>;

  listAvailableYears: () => Effect.Effect<number[], PlatformError, never>;

  createFile: (params: {
    day: number;
    year: number;
  }) => Effect.Effect<"Created file!", FileExistsError | FileCreationError | PlatformError, never>;

  runDayFile: (params: {
    day: number;
    year: number;
  }) => Effect.Effect<
    Record<string, unknown>[],
    DayFileNotFoundError | DayExecutionError | PlatformError,
    never
  >;

  resetDatabase: (params: {
    day: number;
    year: number;
  }) => Effect.Effect<
    "Database reset successful",
    DatabaseResetError | SqlConnectionError | PlatformError,
    never
  >;
}

export type DayRunResult = Record<string, unknown>[];

export class CliTools extends Context.Tag("CliTools")<CliTools, CliToolsService>() {}

export const makeCliToolsLive = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  templateFn: (params: { year: number; day: number }) => string,
  sqlTemplateFn: (params: { year: number; day: number }) => string,
) => ({
  listAvailableDays: (year: number) =>
    Effect.gen(function* () {
      const cwd = path.resolve();
      const yearDir = year.toString();
      const yearPath = path.join(cwd, yearDir);

      const dirExists = yield* fs.exists(yearPath);
      if (!dirExists) {
        return [];
      }

      const isDir = yield* fs.stat(yearPath).pipe(Effect.map((s) => s.type === "Directory"));

      if (!isDir) {
        return [];
      }

      const availableDays: Array<{ day: number; year: number }> = [];

      const yearFiles = yield* fs.readDirectory(yearPath);
      const dayFiles = yearFiles.filter((f) => /^\d+\.ts$/.test(f) && !f.endsWith(".sql"));

      for (const dayFile of dayFiles) {
        const dayFilePath = path.join(yearPath, dayFile);
        const fileExists = yield* fs.exists(dayFilePath);

        if (!fileExists) continue;

        const result = Schema.decodeUnknownEither(
          Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 25)),
        )(dayFile.replace(".ts", ""));

        if (Either.isRight(result)) {
          availableDays.push({
            day: result.right,
            year,
          });
        }
      }

      return availableDays.sort((a, b) => a.day - b.day);
    }),

  listAvailableYears: () =>
    Effect.gen(function* () {
      const cwd = path.resolve();
      const entries = yield* fs.readDirectory(cwd);

      const years: number[] = [];

      for (const entry of entries) {
        if (!/^\d{4}$/.test(entry)) continue;

        const yearPath = path.join(cwd, entry);
        const isDir = yield* fs.stat(yearPath).pipe(Effect.map((s) => s.type === "Directory"));

        if (isDir) {
          years.push(parseInt(entry, 10));
        }
      }

      return years.sort((a, b) => b - a);
    }),

  createFile: ({ day, year }: { day: number; year: number }) =>
    Effect.gen(function* () {
      const cwd = path.resolve();
      const yearDir = path.join(cwd, year.toString());
      const dayFile = path.join(yearDir, `${day}.ts`);
      const sqlFile = path.join(yearDir, `${day}.sql`);

      const yearDirExists = yield* fs.exists(yearDir);
      const dayFileExists = yield* fs.exists(dayFile);
      const sqlFileExists = yield* fs.exists(sqlFile);

      if (dayFileExists) {
        return yield* new FileExistsError({
          path: `${year}/${day}.ts`,
        });
      }

      if (sqlFileExists) {
        return yield* new FileExistsError({
          path: `${year}/${day}.sql`,
        });
      }

      if (!yearDirExists) {
        yield* fs.makeDirectory(yearDir);
      }

      const dayWriteResult = yield* fs
        .writeFileString(dayFile, templateFn({ year, day }))
        .pipe(Effect.either);

      const sqlWriteResult = yield* fs
        .writeFileString(sqlFile, sqlTemplateFn({ year, day }))
        .pipe(Effect.either);

      if (Either.isLeft(dayWriteResult) || Either.isLeft(sqlWriteResult)) {
        yield* Effect.ignore(
          Effect.gen(function* () {
            if (Either.isRight(dayWriteResult)) {
              yield* fs.remove(dayFile);
            }

            if (Either.isRight(sqlWriteResult)) {
              yield* fs.remove(sqlFile);
            }

            if (!yearDirExists) {
              yield* fs.remove(yearDir);
            }
          }),
        );

        return yield* new FileCreationError({
          message: "Failure to create file",
        });
      }

      return "Created file!" as const;
    }),
});
