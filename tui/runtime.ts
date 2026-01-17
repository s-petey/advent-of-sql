import { Effect, Either, Layer, ManagedRuntime, Schema } from "effect";
import { Path, FileSystem } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { SQL } from "bun";
import { sqlTemplate, template } from "./template";

// --- Database Connection Check ---

const checkPostgresConnection = Effect.tryPromise({
    try: async () => {
        const pg = new SQL(
            "postgres://postgres:postgres@localhost:5432/postgres",
        );
        await pg`SELECT 1`;
        await pg.close();
        return true;
    },
    catch: () => new Error("PostgreSQL connection failed"),
});

// --- Errors ---

export class FileExistsError extends Schema.TaggedError<FileExistsError>()(
    "FileExistsError",
    {
        path: Schema.String,
    },
) {}

export class FileCreationError extends Schema.TaggedError<FileCreationError>()(
    "FileCreationError",
    {
        message: Schema.String,
    },
) {}

// --- CliTools Service ---

// Define the service using Effect.Service class pattern
// This creates a proper Context.Tag and Layer automatically
export class CliTools extends Effect.Service<CliTools>()("CliTools", {
    // Use 'effect' to define the service implementation with dependencies
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        return {
            listAvailableDays: (year: number) =>
                Effect.gen(function* () {
                    const cwd = path.resolve();
                    const yearDir = year.toString();
                    const yearPath = path.join(cwd, yearDir);

                    const dirExists = yield* fs.exists(yearPath);
                    if (!dirExists) {
                        return [];
                    }

                    const isDir = yield* fs
                        .stat(yearPath)
                        .pipe(Effect.map((s) => s.type === "Directory"));

                    if (!isDir) {
                        return [];
                    }

                    const availableDays: Array<{ day: number; year: number }> =
                        [];

                    const yearFiles = yield* fs.readDirectory(yearPath);
                    const dayFiles = yearFiles.filter(
                        (f) => /^\d+\.ts$/.test(f) && !f.endsWith(".sql"),
                    );

                    for (const dayFile of dayFiles) {
                        const dayFilePath = path.join(yearPath, dayFile);
                        const fileExists = yield* fs.exists(dayFilePath);

                        if (!fileExists) continue;

                        const result = Schema.decodeUnknownEither(
                            Schema.NumberFromString.pipe(
                                Schema.int(),
                                Schema.between(1, 24),
                            ),
                        )(dayFile.replace(".ts", ""));

                        if (Either.isRight(result)) {
                            availableDays.push({
                                day: result.right,
                                year,
                            });
                        }
                    }

                    // Sort by day ascending
                    return availableDays.sort((a, b) => a.day - b.day);
                }),

            listAvailableYears: () =>
                Effect.gen(function* () {
                    const cwd = path.resolve();
                    const entries = yield* fs.readDirectory(cwd);

                    // Find year directories (numeric names)
                    const years: number[] = [];

                    for (const entry of entries) {
                        if (!/^\d{4}$/.test(entry)) continue;

                        const yearPath = path.join(cwd, entry);
                        const isDir = yield* fs
                            .stat(yearPath)
                            .pipe(Effect.map((s) => s.type === "Directory"));

                        if (isDir) {
                            years.push(parseInt(entry, 10));
                        }
                    }

                    // Sort years descending (most recent first)
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
                        .writeFileString(dayFile, template({ year, day }))
                        .pipe(Effect.either);

                    // Create a basic SQL template for database reset
                    const yearWriteResult = yield* fs
                        .writeFileString(sqlFile, sqlTemplate({ year, day }))
                        .pipe(Effect.either);

                    if (
                        Either.isLeft(dayWriteResult) ||
                        Either.isLeft(yearWriteResult)
                    ) {
                        yield* Effect.ignore(
                            Effect.gen(function* () {
                                if (Either.isRight(dayWriteResult)) {
                                    yield* fs.remove(dayFile);
                                }

                                if (Either.isRight(yearWriteResult)) {
                                    yield* fs.remove(sqlFile);
                                }

                                // Cleanup if we created the directory
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

            runDayFile: ({ day, year }: { day: number; year: number }) =>
                Effect.gen(function* () {
                    const cwd = path.resolve();
                    const dayFilePath = path.join(
                        cwd,
                        year.toString(),
                        `${day}.ts`,
                    );

                    const fileExists = yield* fs.exists(dayFilePath);
                    if (!fileExists) {
                        return yield* new DayFileNotFoundError({
                            path: `${year}/${day}.ts`,
                        });
                    }

                    // Import the day file and get the exported Effect
                    const module = yield* Effect.tryPromise({
                        try: async () => {
                            // Import with timestamp to bypass cache
                            return await import(
                                `${dayFilePath}?update=${Date.now()}`
                            );
                        },
                        catch: (error) =>
                            new DayExecutionError({
                                message: `Failed to import ${year}/${day}.ts: ${error}`,
                            }),
                    });

                    // Check if module exports a default Effect
                    if (!module.default || !Effect.isEffect(module.default)) {
                        return yield* new DayExecutionError({
                            message: `${year}/${day}.ts does not export a default Effect`,
                        });
                    }

                    // Run the exported Effect and get the result
                    const result = yield* Effect.tryPromise({
                        try: () => Effect.runPromise(module.default),
                        catch: (error) =>
                            new DayExecutionError({
                                message: `Failed to run ${year}/${day}.ts: ${error}`,
                            }),
                    });

                    // Convert result to array of records for table display
                    const tableData: Record<string, unknown>[] = Array.isArray(
                        result,
                    )
                        ? (result as Record<string, unknown>[])
                        : typeof result === "object" && result !== null
                          ? [result as Record<string, unknown>]
                          : [];

                    return tableData;
                }),

            resetDatabase: ({ day, year }: { day: number; year: number }) =>
                Effect.gen(function* () {
                    const cwd = path.resolve();
                    const sqlFilePath = path.join(
                        cwd,
                        year.toString(),
                        `${day}.sql`,
                    );

                    // Check PostgreSQL connection first
                    const pgConnected =
                        yield* Effect.either(checkPostgresConnection);
                    if (Either.isLeft(pgConnected)) {
                        return yield* new DatabaseResetError({
                            message:
                                "PostgreSQL connection failed. Ensure it's running on localhost:5432",
                        });
                    }

                    // Check if SQL file exists
                    const fileExists = yield* fs.exists(sqlFilePath);
                    if (!fileExists) {
                        return yield* new DatabaseResetError({
                            message: `No SQL reset file found: ${year}/${day}.sql`,
                        });
                    }

                    // Read SQL file content
                    const sqlContent = yield* fs.readFileString(sqlFilePath);

                    // Execute the SQL
                    yield* Effect.tryPromise({
                        try: async () => {
                            const pg = new SQL(
                                "postgres://postgres:postgres@localhost:5432/postgres",
                            );
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
    // Declare dependencies - these will be bundled into Default layer
    dependencies: [BunContext.layer],
}) {}

// --- Run Day Errors ---

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

// DayRunResult is now just an array of records returned from the SQL query
export type DayRunResult = Record<string, unknown>[];

// TODO: Database for app running.
// const DatabaseLive = PgClient.layerConfig({
//     password: Config.redacted("db_password"),
//     username: Config.succeed("postgres"),
//     database: Config.succeed("postgres"),
//     host: Config.succeed("localhost"),
//     port: Config.succeed(5432),
// });

// --- Layer Composition ---

// The main layer provides all dependencies for the CLI tools
const MainLayer = Layer.mergeAll(BunContext.layer, CliTools.Default);

// --- Managed Runtime ---

// Create the managed runtime with the main layer
// This runtime can be used to run effects with all services available
export const cliRuntime = ManagedRuntime.make(MainLayer);
