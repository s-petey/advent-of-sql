import { Effect, Layer, ManagedRuntime, Schema } from "effect";
import { Path, FileSystem } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";
import { template } from "./template";

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

                    const yearDirExists = yield* fs.exists(yearDir);
                    const dayFileExists = yield* fs.exists(dayFile);

                    if (dayFileExists) {
                        return yield* new FileExistsError({
                            path: `${year}/${day}.ts`,
                        });
                    }

                    if (!yearDirExists) {
                        yield* fs.makeDirectory(yearDir);
                    }

                    const writeResult = yield* fs
                        .writeFileString(dayFile, template({ year, day }))
                        .pipe(Effect.either);

                    if (writeResult._tag === "Left") {
                        // Cleanup if we created the directory
                        if (!yearDirExists) {
                            yield* fs.remove(yearDir);
                        }
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
