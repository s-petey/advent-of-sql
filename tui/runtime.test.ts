import { describe, it, expect } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { makeMockCliTools, makeTestCliToolsLayer } from "./runtime.mock";
import { CliTools } from "./runtime.core";

describe("CliTools", () => {
  describe("listAvailableYears", () => {
    it.effect("returns empty array when no year directories exist", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const years = yield* tools.listAvailableYears();
        expect(years).toEqual([]);
      }).pipe(Effect.provide(makeTestCliToolsLayer({}, ["/test/cwd"]))),
    );

    it.effect("returns years sorted descending (most recent first)", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const years = yield* tools.listAvailableYears();
        expect(years).toEqual([2024, 2023, 2015]);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer({}, [
            "/test/cwd",
            "/test/cwd/2023",
            "/test/cwd/2024",
            "/test/cwd/2015",
          ]),
        ),
      ),
    );

    it.effect("ignores non-year directories", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const years = yield* tools.listAvailableYears();
        expect(years).toEqual([2024]);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer({}, [
            "/test/cwd",
            "/test/cwd/2024",
            "/test/cwd/src",
            "/test/cwd/node_modules",
            "/test/cwd/123", // Not a valid year (only 3 digits)
          ]),
        ),
      ),
    );

    it.effect("ignores files that look like years", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const years = yield* tools.listAvailableYears();
        expect(years).toEqual([2024]);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer({ "/test/cwd/2023": "this is a file, not a directory" }, [
            "/test/cwd",
            "/test/cwd/2024",
          ]),
        ),
      ),
    );
  });

  describe("listAvailableDays", () => {
    it.effect("returns empty array when year directory does not exist", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const days = yield* tools.listAvailableDays(2024);
        expect(days).toEqual([]);
      }).pipe(Effect.provide(makeTestCliToolsLayer({}, ["/test/cwd"]))),
    );

    it.effect("returns days sorted ascending", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const days = yield* tools.listAvailableDays(2024);
        expect(days).toEqual([
          { day: 1, year: 2024 },
          { day: 2, year: 2024 },
          { day: 10, year: 2024 },
          { day: 25, year: 2024 },
        ]);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer(
            {
              "/test/cwd/2024/1.ts": "// day 1",
              "/test/cwd/2024/2.ts": "// day 2",
              "/test/cwd/2024/10.ts": "// day 10",
              "/test/cwd/2024/25.ts": "// day 25",
            },
            ["/test/cwd", "/test/cwd/2024"],
          ),
        ),
      ),
    );

    it.effect("ignores non-day files", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const days = yield* tools.listAvailableDays(2024);
        expect(days).toEqual([{ day: 1, year: 2024 }]);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer(
            {
              "/test/cwd/2024/1.ts": "// day 1",
              "/test/cwd/2024/1.sql": "-- sql file",
              "/test/cwd/2024/helper.ts": "// helper",
              "/test/cwd/2024/README.md": "# readme",
            },
            ["/test/cwd", "/test/cwd/2024"],
          ),
        ),
      ),
    );

    it.effect("ignores days outside valid range (1-25)", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const days = yield* tools.listAvailableDays(2024);
        expect(days).toEqual([
          { day: 1, year: 2024 },
          { day: 25, year: 2024 },
        ]);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer(
            {
              "/test/cwd/2024/0.ts": "// invalid day 0",
              "/test/cwd/2024/1.ts": "// day 1",
              "/test/cwd/2024/25.ts": "// day 25",
              "/test/cwd/2024/26.ts": "// invalid day 26",
              "/test/cwd/2024/100.ts": "// invalid day 100",
            },
            ["/test/cwd", "/test/cwd/2024"],
          ),
        ),
      ),
    );

    it.effect("returns empty array when year path is a file", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const days = yield* tools.listAvailableDays(2024);
        expect(days).toEqual([]);
      }).pipe(
        Effect.provide(makeTestCliToolsLayer({ "/test/cwd/2024": "file content" }, ["/test/cwd"])),
      ),
    );
  });

  describe("createFile", () => {
    it.effect("creates both .ts and .sql files", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* tools.createFile({ day: 1, year: 2024 });
        expect(result).toBe("Created file!");
      }).pipe(Effect.provide(makeTestCliToolsLayer({}, ["/test/cwd", "/test/cwd/2024"]))),
    );

    it.effect("creates year directory if it does not exist", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* tools.createFile({ day: 1, year: 2024 });
        expect(result).toBe("Created file!");
      }).pipe(Effect.provide(makeTestCliToolsLayer({}, ["/test/cwd"]))),
    );

    it.effect("fails if .ts file already exists", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* Effect.exit(tools.createFile({ day: 1, year: 2024 }));
        expect(Exit.isFailure(result)).toBe(true);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer({ "/test/cwd/2024/1.ts": "existing content" }, [
            "/test/cwd",
            "/test/cwd/2024",
          ]),
        ),
      ),
    );

    it.effect("fails if .sql file already exists", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* Effect.exit(tools.createFile({ day: 1, year: 2024 }));
        expect(Exit.isFailure(result)).toBe(true);
      }).pipe(
        Effect.provide(
          makeTestCliToolsLayer({ "/test/cwd/2024/1.sql": "existing sql" }, [
            "/test/cwd",
            "/test/cwd/2024",
          ]),
        ),
      ),
    );
  });

  describe("MockCliTools", () => {
    it.effect("returns configured years", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const years = yield* tools.listAvailableYears();
        expect(years).toEqual([2025, 2024, 2023]);
      }).pipe(Effect.provide(makeMockCliTools({ years: [2025, 2024, 2023] }))),
    );

    it.effect("returns configured days for year", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const days = yield* tools.listAvailableDays(2024);
        expect(days).toEqual([
          { day: 1, year: 2024 },
          { day: 5, year: 2024 },
          { day: 10, year: 2024 },
        ]);
      }).pipe(Effect.provide(makeMockCliTools({ days: { 2024: [1, 5, 10] } }))),
    );

    it.effect("createFile succeeds when file does not exist", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* tools.createFile({ day: 1, year: 2024 });
        expect(result).toBe("Created file!");
      }).pipe(Effect.provide(makeMockCliTools({ existingFiles: [] }))),
    );

    it.effect("createFile fails when file already exists", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* Effect.exit(tools.createFile({ day: 1, year: 2024 }));
        expect(Exit.isFailure(result)).toBe(true);
      }).pipe(Effect.provide(makeMockCliTools({ existingFiles: ["2024/1.ts"] }))),
    );

    it.effect("runDayFile returns configured result", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* tools.runDayFile({ day: 1, year: 2024 });
        expect(result).toEqual([{ answer: 42 }]);
      }).pipe(
        Effect.provide(
          makeMockCliTools({
            days: { 2024: [1] },
            runDayResult: [{ answer: 42 }],
          }),
        ),
      ),
    );

    it.effect("runDayFile fails when day does not exist", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* Effect.exit(tools.runDayFile({ day: 99, year: 2024 }));
        expect(Exit.isFailure(result)).toBe(true);
      }).pipe(Effect.provide(makeMockCliTools({ days: { 2024: [1] } }))),
    );

    it.effect("resetDatabase succeeds when connected", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* tools.resetDatabase({
          day: 1,
          year: 2024,
        });
        expect(result).toBe("Database reset successful");
      }).pipe(Effect.provide(makeMockCliTools({ databaseConnected: true }))),
    );

    it.effect("resetDatabase fails when not connected", () =>
      Effect.gen(function* () {
        const tools = yield* CliTools;
        const result = yield* Effect.exit(tools.resetDatabase({ day: 1, year: 2024 }));
        expect(Exit.isFailure(result)).toBe(true);
      }).pipe(Effect.provide(makeMockCliTools({ databaseConnected: false }))),
    );
  });
});
