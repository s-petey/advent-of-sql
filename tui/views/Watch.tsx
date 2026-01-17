import { useEffect, useState } from "react";
import type { ContentProps } from "../App";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";
import { Footer, Header } from "../components/Layout";
import { TextAttributes } from "@opentui/core";
import { Effect } from "effect";
import { cliRuntime, CliTools } from "../runtime";

interface DayOption {
    day: number;
    year: number;
}

const ROWS_PER_COLUMN = 6;

type FocusMode = "days" | "year";

export function WatchView({ onQuit, setView }: ContentProps) {
    const [days, setDays] = useState<DayOption[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [currentYear, setCurrentYear] = useState(() =>
        new Date().getFullYear(),
    );
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [focusMode, setFocusMode] = useState<FocusMode>("days");

    // Load available years on mount
    useEffect(() => {
        const loadYears = async () => {
            const years = await cliRuntime.runPromise(
                Effect.gen(function* () {
                    const cliTools = yield* CliTools;
                    return yield* cliTools.listAvailableYears();
                }),
            );
            setAvailableYears(years);
            // If current year has no data, default to most recent year with data
            if (years.length > 0 && !years.includes(currentYear)) {
                setCurrentYear(years[0] ?? currentYear);
            }
        };
        loadYears();
    }, []);

    // Load days when year changes
    useEffect(() => {
        const loadDays = async () => {
            setLoading(true);
            const result = await cliRuntime.runPromise(
                Effect.gen(function* () {
                    const cliTools = yield* CliTools;
                    return yield* cliTools.listAvailableDays(currentYear);
                }),
            );
            setDays(result);
            setSelectedIndex(0);
            setLoading(false);
        };
        loadDays();
    }, [currentYear]);

    const currentYearIndex = availableYears.indexOf(currentYear);
    const hasPreviousYear = currentYearIndex < availableYears.length - 1;
    const hasNextYear = currentYearIndex > 0;

    const goToPreviousYear = () => {
        const prevYear = availableYears[currentYearIndex + 1];
        if (hasPreviousYear && prevYear !== undefined) {
            setCurrentYear(prevYear);
        }
    };

    const goToNextYear = () => {
        const nextYear = availableYears[currentYearIndex - 1];
        if (hasNextYear && nextYear !== undefined) {
            setCurrentYear(nextYear);
        }
    };

    useKeyboard((key) => {
        if (key.name === "q" || key.name === "escape") {
            return setView(null);
        }

        // Tab to switch between day selection and year selection
        if (key.name === "tab") {
            setFocusMode((prev) => (prev === "days" ? "year" : "days"));
            return;
        }

        if (focusMode === "year") {
            // Year navigation mode - h/l or left/right to change year
            switch (key.name) {
                case "h":
                case "left":
                    goToPreviousYear();
                    break;
                case "l":
                case "right":
                    goToNextYear();
                    break;
                case "return":
                case "w":
                    // Switch back to days and start watch if a day is selected
                    if (days.length > 0) {
                        // TODO: Implement actual watch functionality
                    }
                    break;
            }
            return;
        }

        // Day selection mode
        if (days.length === 0) return;

        // Vim motions and arrow keys for navigation
        // Grid is arranged as columns, so:
        // - h/left: move left (previous column)
        // - l/right: move right (next column)
        // - j/down: move down (next row in same column)
        // - k/up: move up (previous row in same column)
        switch (key.name) {
            case "h":
            case "left":
                setSelectedIndex((prev) => {
                    // Move left one column (subtract ROWS_PER_COLUMN)
                    const newIndex = prev - ROWS_PER_COLUMN;
                    if (newIndex >= 0) return newIndex;
                    // Wrap to last column in same row
                    const row = prev % ROWS_PER_COLUMN;
                    const lastCol = Math.floor(
                        (days.length - 1) / ROWS_PER_COLUMN,
                    );
                    const wrappedIndex = lastCol * ROWS_PER_COLUMN + row;
                    return Math.min(wrappedIndex, days.length - 1);
                });
                break;
            case "l":
            case "right":
                setSelectedIndex((prev) => {
                    // Move right one column (add ROWS_PER_COLUMN)
                    const newIndex = prev + ROWS_PER_COLUMN;
                    if (newIndex < days.length) return newIndex;
                    // Wrap to first column in same row
                    const row = prev % ROWS_PER_COLUMN;
                    return row < days.length ? row : 0;
                });
                break;
            case "j":
            case "down":
                setSelectedIndex((prev) => {
                    // Move down one row in same column
                    const col = Math.floor(prev / ROWS_PER_COLUMN);
                    const row = prev % ROWS_PER_COLUMN;
                    const newRow = (row + 1) % ROWS_PER_COLUMN;
                    const newIndex = col * ROWS_PER_COLUMN + newRow;
                    return newIndex < days.length ? newIndex : prev;
                });
                break;
            case "k":
            case "up":
                setSelectedIndex((prev) => {
                    // Move up one row in same column
                    const col = Math.floor(prev / ROWS_PER_COLUMN);
                    const row = prev % ROWS_PER_COLUMN;
                    const newRow = row === 0 ? ROWS_PER_COLUMN - 1 : row - 1;
                    const newIndex = col * ROWS_PER_COLUMN + newRow;
                    // Check if this index exists, otherwise stay
                    return newIndex < days.length && newIndex >= 0
                        ? newIndex
                        : prev;
                });
                break;
            case "return":
            case "w":
                // Start watch mode (no action yet)
                // TODO: Implement actual watch functionality
                break;
        }
    });

    // Organize days into columns
    const columns: DayOption[][] = [];
    for (let i = 0; i < days.length; i += ROWS_PER_COLUMN) {
        columns.push(days.slice(i, i + ROWS_PER_COLUMN));
    }

    const isDaysFocused = focusMode === "days";
    const isYearFocused = focusMode === "year";

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
                    Watch Mode - {currentYear}
                </text>
            </Header>

            <box
                style={{
                    padding: 2,
                    flexDirection: "column",
                    borderColor: isDaysFocused
                        ? theme["Toasted Almond"]
                        : theme["Charcoal Blue"],
                    margin: 4,
                    marginTop: 2,
                    marginBottom: 2,
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 1,
                }}
                border
            >
                <text
                    style={{
                        fg: theme.Silver,
                        marginBottom: 1,
                    }}
                >
                    Select a day to watch:
                </text>

                {loading ? (
                    <text style={{ fg: theme.Silver }}>Loading...</text>
                ) : days.length === 0 ? (
                    <box
                        style={{
                            flexDirection: "row",
                            gap: 4,
                            justifyContent: "center",
                            height: ROWS_PER_COLUMN,
                        }}
                    >
                        <text style={{ fg: theme["Autumn Ember"] }}>
                            No days available for {currentYear}. Create one
                            first!
                        </text>
                    </box>
                ) : (
                    <box
                        style={{
                            flexDirection: "row",
                            gap: 4,
                            justifyContent: "center",
                            height: ROWS_PER_COLUMN,
                        }}
                    >
                        {columns.map((column, colIdx) => (
                            <box
                                key={colIdx}
                                style={{
                                    flexDirection: "column",
                                    gap: 0,
                                }}
                            >
                                {column.map((option, rowIdx) => {
                                    const globalIndex =
                                        colIdx * ROWS_PER_COLUMN + rowIdx;
                                    const isSelected =
                                        globalIndex === selectedIndex &&
                                        isDaysFocused;
                                    return (
                                        <text
                                            key={`${option.year}-${option.day}`}
                                            style={{
                                                fg: isSelected
                                                    ? theme["Toasted Almond"]
                                                    : theme.Silver,
                                                ...(isSelected
                                                    ? {
                                                          attributes:
                                                              TextAttributes.BOLD,
                                                      }
                                                    : {}),
                                            }}
                                        >
                                            {isSelected ? "> " : "  "}
                                            Day{" "}
                                            {String(option.day).padStart(
                                                2,
                                                "0",
                                            )}
                                        </text>
                                    );
                                })}
                            </box>
                        ))}
                    </box>
                )}

                {/* Year navigation */}
                <box
                    style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 4,
                        marginTop: 2,
                        borderColor: isYearFocused
                            ? theme["Toasted Almond"]
                            : "transparent",
                        padding: 1,
                    }}
                    border={isYearFocused}
                >
                    <text
                        style={{
                            fg: hasPreviousYear
                                ? theme.Silver
                                : theme["Charcoal Blue"],
                        }}
                    >
                        &#x2190;{" "}
                        {hasPreviousYear
                            ? availableYears[currentYearIndex + 1]
                            : "----"}
                    </text>
                    <text
                        style={{
                            fg: isYearFocused
                                ? theme["Toasted Almond"]
                                : theme["Autumn Ember"],
                            ...(isYearFocused
                                ? { attributes: TextAttributes.BOLD }
                                : {}),
                        }}
                    >
                        {currentYear}
                    </text>
                    <text
                        style={{
                            fg: hasNextYear
                                ? theme.Silver
                                : theme["Charcoal Blue"],
                        }}
                    >
                        {hasNextYear
                            ? availableYears[currentYearIndex - 1]
                            : "----"}{" "}
                        &#x2192;
                    </text>
                </box>
            </box>

            <Footer>
                <text
                    style={{
                        fg: theme.Silver,
                    }}
                >
                    <strong style={{ fg: theme["Autumn Ember"] }}>Tab</strong>{" "}
                    to switch between days/year.{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        h j k l
                    </strong>{" "}
                    or{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        Arrow keys
                    </strong>{" "}
                    to navigate.{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        Enter | w
                    </strong>{" "}
                    to start watch.{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        q | Esc
                    </strong>{" "}
                    to go back.
                </text>
            </Footer>
        </>
    );
}
