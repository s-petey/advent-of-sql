import { Effect, Layer, ManagedRuntime, Schema } from "effect";
import { Path, FileSystem } from "@effect/platform";
import { BunContext } from "@effect/platform-bun";

class FileExistsError extends Schema.TaggedError<FileExistsError>()(
    "FileExistsError",
    {},
) {}

// I'll try out this approach of making a "service program"
export const cliToolsService = Effect.gen(function* () {
    return {
        createFile: ({ day, year }: { day: number; year: number }) =>
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const cwd = path.resolve();

                const yearDir = path.join(cwd, year.toString());
                const isYearDirNew = yield* fs.exists(yearDir);
                const dayFile = path.join(yearDir, `${day}.ts`);
                const dayFileExists = yield* fs.exists(dayFile);
                if (dayFileExists) {
                    return yield* new FileExistsError();
                }

                if (!isYearDirNew) {
                    yield* fs.makeDirectory(yearDir);
                }

                const result = yield* Effect.try(() =>
                    fs.writeFileString(dayFile, "// Your starting point"),
                ).pipe(Effect.flatten, Effect.either);

                if (result._tag === "Left" && isYearDirNew) {
                    yield* fs.remove(yearDir);
                    return "Failure to create file" as const;
                }

                return "Created file!" as const;
            }),
    };
});

export type Tool = typeof cliToolsService;

// OR something like this:
// https://github.com/fernandoabolafio/repobase/blob/c3105983b382f4fcc01a2b2698970738b2c9f2ca/packages/engine/src/services/RepobaseEngine.ts

// const DatabaseLive = PgClient.layerConfig({
//     password: Config.redacted("db_password"),
//     username: Config.succeed("postgres"),
//     database: Config.succeed("postgres"),
//     host: Config.succeed("localhost"),
//     port: Config.succeed(5432),
// });

// const MainLayer = Layer.provide(BunContext.layer);
const MainLayer = Layer.mergeAll(
    // DatabaseLive,
    BunContext.layer,
);

export const cliRuntime = ManagedRuntime.make(MainLayer); //.pipe(BunRuntime.runMain)
