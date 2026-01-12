import { BunContext } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";

import { createCliRenderer } from "@opentui/core";

import { createRoot } from "@opentui/react";
import { App, TableView } from "./App";

class RendererError extends Schema.TaggedError<RendererError>()(
    "RendererError",
    {},
) {}

const MainLayer = Layer.provide(BunContext.layer);

const makeRenderer = Effect.gen(function* () {
    const renderer = yield* Effect.tryPromise({
        try: () => createCliRenderer(),
        catch: () => new RendererError(),
    });

    // FIXME: Start by prompting what file the user
    // wants to run / create...
    // Prompt for the day (default to today)
    // Prompt for the year (default to this year)
    // then create and run the file... (watch mode)
    // We can have a separate CLI command for just running
    // a specific file directly...

    // FIXME: Get CLI args for day / year
    const today = new Date();
    const year = today.getFullYear();
    const day = today.getDate();

    function handleQuit() {
        renderer.destroy();
        process.exit(0);
    }

    createRoot(renderer).render(<App onQuit={handleQuit} />);

    return renderer;
});

Effect.runPromise(
    Effect.scoped(makeRenderer).pipe(
        Effect.tap(function* (renderer) {
            yield* Effect.addFinalizer(
                () => {
                    // Effect.gen(function* ()
                    renderer.destroy();
                    process.exit(0);
                },
                // ),
            );
        }),
        // Effect.provide(MainLayer)
    ),
);
