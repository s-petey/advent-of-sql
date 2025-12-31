import { Args, Command } from "@effect/cli";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { FileSystem, Path } from "@effect/platform";
import { Logger, Effect, Stream, Layer } from "effect";
import * as fs from "node:fs";
import * as Doc from "@effect/printer-ansi/AnsiDoc";
import * as Ansi from "@effect/printer-ansi/Ansi";
import * as Color from "@effect/printer-ansi/Color";

// Helper function to render colored text
const renderColor = (doc: Doc.AnsiDoc): string => {
  return Doc.render(doc, { style: "pretty" });
};

// Color helpers for common message types
const success = (text: string) =>
  renderColor(Doc.annotate(Doc.text(text), Ansi.green));
const error = (text: string) =>
  renderColor(Doc.annotate(Doc.text(text), Ansi.red));
const info = (text: string) =>
  renderColor(Doc.annotate(Doc.text(text), Ansi.cyan));
const warning = (text: string) =>
  renderColor(Doc.annotate(Doc.text(text), Ansi.yellow));
const highlight = (text: string) =>
  renderColor(Doc.annotate(Doc.text(text), Ansi.brightColor(Color.magenta)));
const bold = (text: string) =>
  renderColor(Doc.annotate(Doc.text(text), Ansi.bold));
const separator = (char: string, length: number) => info(char.repeat(length));

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
        console.log(success(`Created directory: ${year}`));
      }

      // Create day file
      const dayFile = path.join(yearDir, `${day}.ts`);
      const dayFileExists = yield* fs.exists(dayFile);

      if (dayFileExists) {
        yield* Effect.log(warning(`File already exists: ${year}/${day}.ts`));
      } else {
        // Create a basic template for the day file
        const template = `// Advent of SQL ${year} - Day ${day}

async function main() {
  // TODO: Implement solution
  console.log("Hello, Advent of SQL ${year} Day ${day}!");
}

main();
`;
        yield* fs.writeFileString(dayFile, template);
        yield* Effect.log(success(`Created file: ${year}/${day}.ts`));
      }

      // Create SQL reset file
      const sqlFile = path.join(yearDir, `${day}.sql`);
      const sqlFileExists = yield* fs.exists(sqlFile);

      if (sqlFileExists) {
        yield* Effect.log(warning(`File already exists: ${year}/${day}.sql`));
      } else {
        // Create a basic SQL template for database reset
        const sqlTemplate = `-- Advent of SQL ${year} - Day ${day}
-- Database Reset Script

`;
        yield* fs.writeFileString(sqlFile, sqlTemplate);
        yield* Effect.log(success(`Created file: ${year}/${day}.sql`));
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
        yield* Effect.log(error(`Error: File not found: ${year}/${day}.ts`));
        yield* Effect.log(info(`Run 'new ${day} ${year}' to create it first.`));
        return;
      }

      yield* Effect.log(info(`Running Day ${day}, Year ${year}...`));

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
        yield* Effect.log(error(`Error: File not found: ${year}/${day}.ts`));
        yield* Effect.log(info(`Run 'new ${day} ${year}' to create it first.`));
        return;
      }

      yield* Effect.log(separator("=", 50));
      yield* Effect.log(bold(`Command: bun run index.ts watch ${day} ${year}`));
      yield* Effect.log(separator("=", 50));
      yield* Effect.log(info(`Watching ${year}/${day}.ts for changes...\n`));

      // Function to display help message
      const showHelp = Effect.gen(function* () {
        yield* Effect.log(separator("=", 50));
        yield* Effect.log(bold("Available Commands:"));
        yield* Effect.log(highlight("  Enter") + "  - Re-run the current file");
        yield* Effect.log(
          highlight("  R    ") + "  - Reset database and re-run"
        );
        yield* Effect.log(highlight("  ?    ") + "  - Show this help message");
        yield* Effect.log(highlight("  Ctrl+C") + " - Exit watch mode");
        yield* Effect.log(separator("=", 50) + "\n");
      });

      yield* showHelp;

      // Enable raw mode for single keypress detection
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();

      // Function to reset the database
      const resetDB = Effect.gen(function* () {
        yield* Effect.log("\n\n" + separator("=", 50));
        yield* Effect.log(warning("DATABASE RESET"));
        yield* Effect.log(separator("=", 50));

        const dbFile = path.join(cwd, year.toString(), `day${day}.db`);
        const dbFileExists = yield* fileSystem.exists(dbFile);

        if (dbFileExists) {
          yield* Effect.tryPromise({
            try: async () => {
              await Bun.write(dbFile, "");
            },
            catch: (error) => new Error(`Failed to clear database: ${error}`),
          });
          yield* Effect.log(
            success(`✓ Database file cleared: ${year}/day${day}.db`)
          );
        } else {
          yield* Effect.log(info("No database file found to reset."));
        }

        yield* Effect.log(separator("=", 50) + "\n");
      });

      // Function to run the file as an Effect
      const runFile = Effect.gen(function* () {
        yield* Effect.log(separator("=", 50));
        yield* Effect.log(info(`Running Day ${day}, Year ${year}...`));
        yield* Effect.log(separator("=", 50));

        yield* Effect.tryPromise({
          try: async () => {
            // Import with timestamp to bypass cache
            await import(`${dayFile}?update=${Date.now()}`);
          },
          catch: (error) =>
            new Error(`Failed to run ${year}/${day}.ts: ${error}`),
        });

        yield* showHelp;
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

      // Create a stream of keyboard input events
      const keyboardStream = Stream.async<string>((emit) => {
        const handleData = (data: Buffer) => {
          const key = data.toString();

          // Handle Ctrl+C
          if (key === "\x03") {
            if (process.stdin.isTTY) {
              process.stdin.setRawMode(false);
            }
            process.stdin.pause();
            process.exit(0);
          }

          // Emit the key for Enter (re-run), R (reset DB), and ? (help)
          if (key === "\r" || key === "\n" || key === "R" || key === "?") {
            emit.single(key);
          }
        };

        process.stdin.on("data", handleData);

        // Cleanup function
        return Effect.sync(() => {
          process.stdin.off("data", handleData);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
        });
      });

      // Merge both streams: file changes trigger re-run, keyboard input triggers actions
      const combinedStream = Stream.merge(
        fileChangeStream.pipe(
          Stream.map(() => ({ type: "fileChange" as const }))
        ),
        keyboardStream.pipe(
          Stream.map((key) => ({ type: "keyboard" as const, key }))
        )
      );

      // Process the combined stream
      return yield* combinedStream.pipe(
        Stream.runForEach((event) => {
          if (event.type === "fileChange") {
            return runFile;
          } else if (event.type === "keyboard") {
            if (event.key === "\r" || event.key === "\n") {
              // Enter key: re-run
              return runFile;
            } else if (event.key === "R") {
              // Capital R: reset DB and re-run
              return Effect.gen(function* () {
                yield* resetDB;
                yield* runFile;
              });
            } else if (event.key === "?") {
              // Question mark: show help
              return showHelp;
            }
          }
          return Effect.void;
        })
      );
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

cli(process.argv).pipe(
  Effect.provide(Layer.mergeAll(BunContext.layer, Logger.pretty)),
  BunRuntime.runMain
);
