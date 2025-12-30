import { Args, Command } from "@effect/cli";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { FileSystem, Path } from "@effect/platform";
import { Console, Effect, Stream } from "effect";
import * as fs from "node:fs";

// Get current date for defaults
const now = new Date();
const currentDay = now.getDate();
const currentYear = now.getFullYear();

// Shared arguments for day and year
const dayArg = Args.integer({ name: "day" }).pipe(Args.withDefault(currentDay));
const yearArg = Args.integer({ name: "year" }).pipe(
  Args.withDefault(currentYear)
);

// "new" command - creates new day or year
const newCommand = Command.make(
  "new",
  { day: dayArg, year: yearArg },
  ({ day, year }) => {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const cwd = process.cwd();

      // Create year directory path
      const yearDir = path.join(cwd, year.toString());

      // Check if year directory exists, create if not
      const yearDirExists = yield* fs.exists(yearDir);
      if (!yearDirExists) {
        yield* fs.makeDirectory(yearDir, { recursive: true });
        yield* Console.log(`Created directory: ${year}`);
      }

      // Create day file
      const dayFile = path.join(yearDir, `${day}.ts`);
      const dayFileExists = yield* fs.exists(dayFile);

      if (dayFileExists) {
        yield* Console.log(`File already exists: ${year}/${day}.ts`);
      } else {
        // Create a basic template for the day file
        const template = `// Advent of Code ${year} - Day ${day}

async function main() {
  // TODO: Implement solution
  console.log("Hello, Advent of Code ${year} Day ${day}!");
}

main();
`;
        yield* fs.writeFileString(dayFile, template);
        yield* Console.log(`Created file: ${year}/${day}.ts`);
      }
    });
  }
);

// "run" command - runs specific day and year
const runCommand = Command.make(
  "run",
  { day: dayArg, year: yearArg },
  ({ year, day }) => {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const cwd = process.cwd();

      // Construct the path to the day file
      const dayFile = path.join(cwd, year.toString(), `${day}.ts`);

      // Check if the file exists
      const fileExists = yield* fs.exists(dayFile);
      if (!fileExists) {
        yield* Console.log(`Error: File not found: ${year}/${day}.ts`);
        yield* Console.log(`Run 'new ${day} ${year}' to create it first.`);
        return;
      }

      yield* Console.log(`Running Day ${day}, Year ${year}...`);

      // Dynamically import and run the file
      yield* Effect.tryPromise({
        try: async () => {
          await import(dayFile);
        },
        catch: (error) =>
          new Error(`Failed to run ${year}/${day}.ts: ${error}`),
      });
    });
  }
);

// "watch" command - watches and re-runs on file changes
const watchCommand = Command.make(
  "watch",
  { day: dayArg, year: yearArg },
  ({ year, day }) => {
    return Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const cwd = process.cwd();

      // Construct the path to the day file
      const dayFile = path.join(cwd, year.toString(), `${day}.ts`);

      // Check if the file exists
      const fileExists = yield* fileSystem.exists(dayFile);
      if (!fileExists) {
        yield* Console.log(`Error: File not found: ${year}/${day}.ts`);
        yield* Console.log(`Run 'new ${day} ${year}' to create it first.`);
        return;
      }

      yield* Console.log(`Watching ${year}/${day}.ts for changes...`);
      yield* Console.log(`Press Ctrl+C to stop watching.\n`);

      // Function to run the file as an Effect
      const runFile = Effect.gen(function* () {
        yield* Console.log(`\n${"=".repeat(50)}`);
        yield* Console.log(`Running Day ${day}, Year ${year}...`);
        yield* Console.log("=".repeat(50));

        yield* Effect.tryPromise({
          try: async () => {
            // Import with timestamp to bypass cache
            await import(`${dayFile}?update=${Date.now()}`);
          },
          catch: (error) =>
            new Error(`Failed to run ${year}/${day}.ts: ${error}`),
        });
      });

      // Run once initially
      yield* runFile;

      // Create a stream of file change events
      const fileChangeStream = Stream.async<void>((emit) => {
        const watcher = fs.watch(dayFile, (eventType) => {
          if (eventType === "change") {
            emit.single(undefined);
          }
        });

        // Cleanup function
        return Effect.sync(() => {
          watcher.close();
        });
      });

      // Process the stream: run the file on each change
      return yield* fileChangeStream.pipe(Stream.runForEach(() => runFile));
    });
  }
);

// Combine commands
const command = Command.make("advent-sql").pipe(
  Command.withSubcommands([newCommand, runCommand, watchCommand])
);

const cli = Command.run(command, {
  name: "advent-sql",
  version: "1.0.0",
});

cli(process.argv).pipe(Effect.provide(BunContext.layer), BunRuntime.runMain);
