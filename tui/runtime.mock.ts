import { Effect, Layer, HashMap, Ref, Option } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { SystemError } from "@effect/platform/Error";
import {
  CliTools,
  FileExistsError,
  DayFileNotFoundError,
  DatabaseResetError,
  makeCliToolsLive,
} from "./runtime.core";
import { Size, type File } from "@effect/platform/FileSystem";

const makeMockPath = () =>
  Path.Path.of({
    [Path.TypeId]: Path.TypeId,
    sep: "/",
    basename: (p) => p.split("/").pop() ?? "",
    dirname: (p) => p.split("/").slice(0, -1).join("/") || "/",
    extname: (p) => {
      const base = p.split("/").pop() ?? "";
      const dot = base.lastIndexOf(".");
      return dot > 0 ? base.slice(dot) : "";
    },
    join: (...paths) => paths.join("/").replace(/\/+/g, "/"),
    resolve: (...paths) => {
      let resolved = "/test/cwd";
      for (const path of paths) {
        if (path.startsWith("/")) {
          resolved = path;
        } else {
          resolved = `${resolved}/${path}`;
        }
      }

      const parts = resolved.split("/").filter((p) => p !== "." && p !== "");
      const result: string[] = [];

      for (const part of parts) {
        if (part === "..") {
          result.pop();
        } else {
          result.push(part);
        }
      }
      return "/" + result.join("/");
    },
    normalize: (p) => p,
    isAbsolute: (p) => p.startsWith("/"),
    relative: (_from, to) => to, // simplified
    parse: (_p) => ({ root: "/", dir: "", base: "", ext: "", name: "" }),
    format: (obj) => obj.dir + "/" + obj.base,
    fromFileUrl: (url) => Effect.succeed(url.pathname),
    toFileUrl: (p) => Effect.succeed(new URL(`file://${p}`)),
    toNamespacedPath: (p) => p,
  });

interface FileEntry {
  type: "File";
  content: string;
}

interface DirectoryEntry {
  type: "Directory";
}

type FSEntry = FileEntry | DirectoryEntry;

export const makeFileSystemState = (
  initialFiles: Record<string, string> = {},
  initialDirs: string[] = [],
) => {
  let entries = HashMap.empty<string, FSEntry>();

  for (const dir of initialDirs) {
    entries = HashMap.set(entries, dir, { type: "Directory" });
  }

  for (const [path, content] of Object.entries(initialFiles)) {
    entries = HashMap.set(entries, path, { type: "File", content });
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/") || "/";
      if (!HashMap.has(entries, dirPath)) {
        entries = HashMap.set(entries, dirPath, { type: "Directory" });
      }
    }
  }

  return Ref.make(entries);
};

export const makeMockFileSystem = (
  initialFiles: Record<string, string> = {},
  initialDirs: string[] = [],
) =>
  Effect.gen(function* () {
    const stateRef = yield* makeFileSystemState(initialFiles, initialDirs);

    const getEntry = (path: string) =>
      Effect.gen(function* () {
        const state = yield* Ref.get(stateRef);
        return HashMap.get(state, path);
      });

    const setEntry = (path: string, entry: FSEntry) =>
      Ref.update(stateRef, (state) => HashMap.set(state, path, entry));

    const removeEntry = (path: string) =>
      Ref.update(stateRef, (state) => HashMap.remove(state, path));

    return FileSystem.FileSystem.of({
      access: (path: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(path);
          if (entry._tag === "None") {
            return yield* new SystemError({
              reason: "NotFound",
              module: "FileSystem",
              method: "access",
              pathOrDescriptor: path,
            });
          }
        }),

      chmod: () => Effect.void,
      chown: () => Effect.void,

      copy: (fromPath: string, toPath: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(fromPath);
          if (entry._tag === "None") {
            return yield* new SystemError({
              reason: "NotFound",
              module: "FileSystem",
              method: "copy",
              pathOrDescriptor: fromPath,
            });
          }
          yield* setEntry(toPath, entry.value);
        }),

      copyFile: (fromPath: string, toPath: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(fromPath);
          if (entry._tag === "None" || entry.value.type !== "File") {
            return yield* new SystemError({
              reason: "NotFound",
              module: "FileSystem",
              method: "copyFile",
              pathOrDescriptor: fromPath,
            });
          }
          yield* setEntry(toPath, entry.value);
        }),

      exists: (path: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(path);
          return entry._tag === "Some";
        }),

      link: () => Effect.void,

      makeDirectory: (path: string) => setEntry(path, { type: "Directory" }),

      makeTempDirectory: () => Effect.succeed("/tmp/test-temp"),
      makeTempDirectoryScoped: () => Effect.succeed("/tmp/test-temp-scoped"),
      makeTempFile: () => Effect.succeed("/tmp/test-temp-file"),
      makeTempFileScoped: () => Effect.succeed("/tmp/test-temp-file-scoped"),

      open: () =>
        Effect.fail(
          new SystemError({
            reason: "Unknown",
            module: "FileSystem",
            method: "open",
            description: "not implemented in mock",
          }),
        ),

      readDirectory: (path: string) =>
        Effect.gen(function* () {
          const state = yield* Ref.get(stateRef);
          const entries: string[] = [];
          const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;

          for (const [entryPath] of HashMap.toEntries(state)) {
            if (entryPath === normalizedPath) continue;
            if (!entryPath.startsWith(normalizedPath + "/")) continue;

            const relativePath = entryPath.slice(normalizedPath.length + 1);
            const firstPart = relativePath.split("/")[0];

            if (firstPart && !entries.includes(firstPart)) {
              entries.push(firstPart);
            }
          }

          return entries;
        }),

      readFile: (path: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(path);
          if (entry._tag === "None" || entry.value.type !== "File") {
            return yield* new SystemError({
              reason: "NotFound",
              module: "FileSystem",
              method: "readFile",
              pathOrDescriptor: path,
            });
          }
          return new Uint8Array(Buffer.from(entry.value.content));
        }),

      readFileString: (path: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(path);
          if (entry._tag === "None" || entry.value.type !== "File") {
            return yield* new SystemError({
              reason: "NotFound",
              module: "FileSystem",
              method: "readFileString",
              pathOrDescriptor: path,
            });
          }
          return entry.value.content;
        }),

      readLink: () =>
        Effect.fail(
          new SystemError({
            reason: "Unknown",
            module: "FileSystem",
            method: "readLink",
            description: "not implemented",
          }),
        ),
      realPath: (path: string) => Effect.succeed(path),

      remove: (path: string) => removeEntry(path),

      rename: (oldPath: string, newPath: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(oldPath);
          if (entry._tag === "Some") {
            yield* setEntry(newPath, entry.value);
            yield* removeEntry(oldPath);
          }
        }),

      sink: () => {
        throw new Error("sink not implemented in mock");
      },

      stat: (path: string) =>
        Effect.gen(function* () {
          const entry = yield* getEntry(path);
          if (entry._tag === "None") {
            return yield* new SystemError({
              reason: "NotFound",
              module: "FileSystem",
              method: "stat",
              pathOrDescriptor: path,
            });
          }
          return yield* Effect.succeed({
            type: entry.value.type,
            mtime: Option.some(new Date()),
            atime: Option.some(new Date()),
            birthtime: Option.some(new Date()),
            dev: 0,
            ino: Option.some(0),
            mode: 0o644,
            nlink: Option.some(1),
            uid: Option.some(1000),
            gid: Option.some(1000),
            rdev: Option.some(0),
            size: Size(0),
            blksize: Option.some(Size(0)),
            blocks: Option.some(1),
          } satisfies File.Info);
        }),

      stream: () => {
        throw new Error("stream not implemented in mock");
      },

      symlink: () => Effect.void,
      truncate: () => Effect.void,
      utimes: () => Effect.void,

      watch: () => {
        throw new Error("watch not implemented in mock");
      },

      writeFile: (path: string, data: Uint8Array | string) =>
        Effect.gen(function* () {
          const content = typeof data === "string" ? data : Buffer.from(data).toString();
          yield* setEntry(path, { type: "File", content });
        }),

      writeFileString: (path: string, content: string) => setEntry(path, { type: "File", content }),
    });
  });

export interface MockCliToolsConfig {
  years?: number[];
  days?: Record<number, number[]>;
  existingFiles?: string[];
  runDayResult?: Record<string, unknown>[];
  databaseConnected?: boolean;
}

export const makeMockCliTools = (config: MockCliToolsConfig = {}) => {
  const {
    years = [2024, 2023],
    days = { 2024: [1, 2, 3], 2023: [1, 2] },
    existingFiles = [],
    runDayResult = [{ result: "mock result" }],
    databaseConnected = true,
  } = config;

  return Layer.succeed(CliTools, {
    listAvailableYears: () => Effect.succeed(years),

    listAvailableDays: (year: number) =>
      Effect.succeed((days[year] || []).map((day) => ({ day, year }))),

    createFile: ({ day, year }: { day: number; year: number }) => {
      const path = `${year}/${day}.ts`;
      if (existingFiles.includes(path)) {
        return Effect.fail(new FileExistsError({ path }));
      }
      return Effect.succeed("Created file!" as const);
    },

    runDayFile: ({ day, year }: { day: number; year: number }) => {
      const path = `${year}/${day}.ts`;
      if (!existingFiles.includes(path) && !days[year]?.includes(day)) {
        return Effect.fail(new DayFileNotFoundError({ path }));
      }
      return Effect.succeed(runDayResult);
    },

    resetDatabase: ({ day, year }: { day: number; year: number }) => {
      void day;
      void year;
      if (!databaseConnected) {
        return Effect.fail(
          new DatabaseResetError({
            message: "PostgreSQL connection failed",
          }),
        );
      }
      return Effect.succeed("Database reset successful" as const);
    },
  });
};

export const makeTestCliToolsLayer = (
  initialFiles: Record<string, string> = {},
  initialDirs: string[] = [],
) => {
  const mockFs = makeMockFileSystem(initialFiles, initialDirs);
  const mockPath = makeMockPath();

  const FileMockLayer = Layer.effect(FileSystem.FileSystem, mockFs);
  const MockPath = Layer.succeed(Path.Path, mockPath);
  const platformLayer = Layer.mergeAll(FileMockLayer, MockPath);

  const cliToolsLayer = Layer.effect(
    CliTools,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const template = ({ year, day }: { year: number; day: number }) => `// Day ${day} of ${year}`;
      const sqlTemplate = ({ year, day }: { year: number; day: number }) =>
        `-- SQL for Day ${day} of ${year}`;

      const core = makeCliToolsLive(fs, path, template, sqlTemplate);

      return {
        ...core,
        runDayFile: ({ day, year }: { day: number; year: number }) => {
          const filePath = `${year}/${day}.ts`;
          return Effect.fail(new DayFileNotFoundError({ path: filePath }));
        },
        resetDatabase: () =>
          Effect.fail(
            new DatabaseResetError({
              message: "Database not available in tests",
            }),
          ),
      };
    }),
  );

  return Layer.provideMerge(cliToolsLayer, platformLayer);
};
