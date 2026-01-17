import { Effect, Either, Layer, ManagedRuntime, Schema } from "effect";
import { Path, FileSystem } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { sqlTemplate, template } from "./template";

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
        };
    }),
    // Declare dependencies - these will be bundled into Default layer
    dependencies: [BunContext.layer],
}) {}

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
