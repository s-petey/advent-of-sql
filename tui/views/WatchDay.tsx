import { useEffect, useState } from "react";
import type { ContentProps } from "../App";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";
import { Footer, Header } from "../components/Layout";
import { TextAttributes } from "@opentui/core";
import { Effect } from "effect";
import {
    cliRuntime,
    CliTools,
    DayFileNotFoundError,
    DayExecutionError,
    DatabaseResetError,
    type DayRunResult,
} from "../runtime";

type WatchDayViewProps = ContentProps;

type RunState =
    | { type: "loading" }
    | { type: "resetting" }
    | { type: "success"; data: DayRunResult }
    | { type: "error"; message: string };

// Loading state component
function LoadingView() {
    return (
        <box
            style={{
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <text style={{ fg: theme.Silver }}>Running...</text>
        </box>
    );
}

// Resetting database state component
function ResettingView() {
    return (
        <box
            style={{
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <text style={{ fg: theme.Silver }}>Resetting database...</text>
        </box>
    );
}

// Error state component
interface ErrorViewProps {
    message: string;
}

function ErrorView({ message }: ErrorViewProps) {
    return (
        <box
            style={{
                justifyContent: "center",
                alignItems: "center",
                padding: 2,
            }}
        >
            <text style={{ fg: theme["Autumn Ember"] }}>Error:</text>
            <text style={{ fg: theme.Silver }}>{message}</text>
        </box>
    );
}

// Empty results component
function EmptyResults() {
    return (
        <box
            style={{
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <text style={{ fg: theme.Silver }}>No data returned from query.</text>
        </box>
    );
}

// Results table component
interface ResultsTableProps {
    columns: string[];
    rows: string[][];
}

function ResultsTable({ columns, rows }: ResultsTableProps) {
    if (rows.length === 0) {
        return <EmptyResults />;
    }

    return (
        <box
            style={{
                flexDirection: "column",
                justifyContent: "space-evenly",
                width: "100%",
            }}
            border
        >
            <box
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 4,
                    padding: 1,
                    marginBottom: 1,
                }}
            >
                {/* Header Row */}
                {columns.map((col) => (
                    <text
                        key={col}
                        style={{
                            fg: theme["Toasted Almond"],
                            attributes: TextAttributes.BOLD,
                        }}
                    >
                        {col}
                    </text>
                ))}
            </box>

            <scrollbox
                style={{
                    scrollbarOptions: {
                        showArrows: true,
                    },
                }}
                focused
            >
                {rows.map((row, i) => (
                    <box
                        key={i}
                        style={{
                            flexDirection: "row",
                            width: "100%",
                            justifyContent: "space-between",
                            padding: 1,
                            backgroundColor:
                                i % 2 === 0
                                    ? theme["Charcoal Blue"]
                                    : theme["Graphone"],
                        }}
                    >
                        {row.map((cell, j) => (
                            <text key={j} style={{ fg: theme.Silver }}>
                                {cell}
                            </text>
                        ))}
                    </box>
                ))}
            </scrollbox>
        </box>
    );
}

// Success state component
interface SuccessViewProps {
    data: DayRunResult;
}

function SuccessView({ data }: SuccessViewProps) {
    const columns = data.length > 0 ? Object.keys(data[0] ?? {}) : [];
    const rows = data.map((row) =>
        columns.map((col) => String(row[col] ?? "")),
    );

    return (
        <box
            style={{
                flexDirection: "column",
            }}
        >
            <ResultsTable columns={columns} rows={rows} />
        </box>
    );
}

export function WatchDayView({
    onQuit,
    setView,
    selectedDay,
}: WatchDayViewProps) {
    const day = selectedDay?.day ?? 1;
    const year = selectedDay?.year ?? new Date().getFullYear();
    const [runState, setRunState] = useState<RunState>({ type: "loading" });

    const executeDay = async () => {
        setRunState({ type: "loading" });

        try {
            const result = await cliRuntime.runPromise(
                Effect.gen(function* () {
                    const cliTools = yield* CliTools;
                    return yield* cliTools.runDayFile({ day, year });
                }),
            );

            if (result instanceof DayFileNotFoundError) {
                setRunState({
                    type: "error",
                    message: `File not found: ${result.path}`,
                });
            } else if (result instanceof DayExecutionError) {
                setRunState({
                    type: "error",
                    message: result.message,
                });
            } else {
                setRunState({ type: "success", data: result });
            }
        } catch (error) {
            setRunState({
                type: "error",
                message: String(error),
            });
        }
    };

    const resetAndRerun = async () => {
        setRunState({ type: "resetting" });

        try {
            const resetResult = await cliRuntime.runPromise(
                Effect.gen(function* () {
                    const cliTools = yield* CliTools;
                    return yield* cliTools.resetDatabase({ day, year });
                }),
            );

            // Check if reset failed (it's an error object, not the success string)
            if (resetResult !== "Database reset successful") {
                const error = resetResult as DatabaseResetError;
                setRunState({
                    type: "error",
                    message: error.message,
                });
                return;
            }

            // Reset successful, now run the day file
            await executeDay();
        } catch (error) {
            setRunState({
                type: "error",
                message: String(error),
            });
        }
    };

    // Run the day file on mount
    useEffect(() => {
        executeDay();
    }, [day, year]);

    useKeyboard((key) => {
        if (key.name === "q" || key.name === "escape") {
            return setView("watch");
        }

        // Enter key to re-run
        if (key.name === "return") {
            return executeDay();
        }

        // r for reset database and re-run
        if (key.name === "r") {
            return resetAndRerun();
        }
    });

    // Calculate row count for footer
    const rowCount =
        runState.type === "success" ? runState.data.length : 0;

    return (
        <>
            <Header>
                <text
                    style={{
                        fg: theme["Blazing Flame"],
                        attributes: TextAttributes.BOLD,
                    }}
                >
                    ADVENT-OF-SQL
                </text>
                <text
                    style={{
                        fg: theme.Silver,
                    }}
                >
                    <em>{`Day ${day} - ${year}`}</em>
                </text>
            </Header>

            {runState.type === "loading" && <LoadingView />}
            {runState.type === "resetting" && <ResettingView />}
            {runState.type === "error" && <ErrorView message={runState.message} />}
            {runState.type === "success" && <SuccessView data={runState.data} />}

            <Footer>
                <text
                    style={{
                        fg: theme["Autumn Ember"],
                        ...(rowCount
                            ? { attributes: TextAttributes.BOLD }
                            : {}),
                    }}
                >
                    {rowCount ? `Total Rows: ${rowCount}` : ""}
                </text>

                <text
                    style={{
                        fg: theme.Silver,
                    }}
                >
                    <strong style={{ fg: theme["Autumn Ember"] }}>Enter</strong>{" "}
                    to re-run |{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>r</strong> to
                    reset DB & re-run |{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        Arrow keys
                    </strong>{" "}
                    to scroll |{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        q | Esc
                    </strong>{" "}
                    to go back
                </text>
            </Footer>
        </>
    );
}
