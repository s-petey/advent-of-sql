import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Effect, Schema } from "effect";
import { App } from "./App";

class RendererError extends Schema.TaggedError<RendererError>()(
    "RendererError",
    {},
) {}

const makeRenderer = Effect.gen(function* () {
    const renderer = yield* Effect.tryPromise({
        try: () => createCliRenderer(),
        catch: () => new RendererError(),
    });

    function handleQuit() {
        renderer.destroy();
        process.exit(0);
    }

    createRoot(renderer).render(<App onQuit={handleQuit} />);

    return renderer;
});

Effect.runPromise(makeRenderer);
