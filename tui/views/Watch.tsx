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

export function WatchView({ onQuit, setView, setSelectedDay, selectedDay }: ContentProps) {
    const [days, setDays] = useState<DayOption[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [currentYear, setCurrentYear] = useState(() =>
        selectedDay?.year ?? new Date().getFullYear(),
    );
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [focusMode, setFocusMode] = useState<FocusMode>("days");
    const [warning, setWarning] = useState<string | null>(null);

    // Get today's date info
    const today = new Date();
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();

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
            // Restore selected index if we have a previously selected day for this year
            if (selectedDay && selectedDay.year === currentYear) {
                const idx = result.findIndex((d) => d.day === selectedDay.day);
                setSelectedIndex(idx >= 0 ? idx : 0);
            } else {
                setSelectedIndex(0);
            }
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
        if (warning) {
            setWarning(null);
        }

        if (key.name === "q" || key.name === "escape") {
            return setView(null);
        }

        if (key.name === "t") {
            if (currentYear !== todayYear) {
                if (availableYears.includes(todayYear)) {
                    setCurrentYear(todayYear);
                    setWarning(
                        `Switched to ${todayYear}. Press t again to run today.`,
                    );
                } else {
                    setWarning(
                        `No files exist for ${todayYear}. Create day ${todayDay} first!`,
                    );
                }
                return;
            }

            const todayExists = days.some((d) => d.day === todayDay);

            if (!todayExists) {
                setWarning(
                    `Day ${todayDay} doesn't exist for ${todayYear}. Create it first!`,
                );
                return;
            }

            const todayIndex = days.findIndex((d) => d.day === todayDay);
            if (todayIndex >= 0) {
                setSelectedIndex(todayIndex);
                setFocusMode("days");
                // Navigate to watchDay view for today
                setSelectedDay({ day: todayDay, year: todayYear });
                setView("watchDay");
            }
            return;
        }

        if (key.name === "tab") {
            setFocusMode((prev) => (prev === "days" ? "year" : "days"));
            return;
        }

        if (focusMode === "year") {
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
                    if (days.length > 0) {
                        const selectedDay = days[selectedIndex];
                        if (selectedDay) {
                            setSelectedDay({
                                day: selectedDay.day,
                                year: selectedDay.year,
                            });
                            setView("watchDay");
                        }
                    }
                    break;
            }
            return;
        }

        if (days.length === 0) return;

        switch (key.name) {
            case "h":
            case "left":
                setSelectedIndex((prev) => {
                    const newIndex = prev - ROWS_PER_COLUMN;
                    if (newIndex >= 0) return newIndex;

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
                    const newIndex = prev + ROWS_PER_COLUMN;
                    if (newIndex < days.length) return newIndex;

                    const row = prev % ROWS_PER_COLUMN;

                    return row < days.length ? row : 0;
                });
                break;
            case "j":
            case "down":
                setSelectedIndex((prev) => {
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
                    const col = Math.floor(prev / ROWS_PER_COLUMN);
                    const row = prev % ROWS_PER_COLUMN;
                    const newRow = row === 0 ? ROWS_PER_COLUMN - 1 : row - 1;
                    const newIndex = col * ROWS_PER_COLUMN + newRow;

                    return newIndex < days.length && newIndex >= 0
                        ? newIndex
                        : prev;
                });
                break;
            case "return":
            case "w": {
                const selectedDay = days[selectedIndex];
                if (selectedDay) {
                    setSelectedDay({
                        day: selectedDay.day,
                        year: selectedDay.year,
                    });
                    setView("watchDay");
                }
                break;
            }
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
                    Watch date picker - {currentYear}
                </text>
            </Header>

            <box
                style={{
                    padding: 2,
                    flexDirection: "column",
                    borderColor: theme["Charcoal Blue"],
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
                            borderColor: isDaysFocused
                                ? theme["Toasted Almond"]
                                : "transparent",
                            padding: 1,
                        }}
                        border={isDaysFocused}
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

                {warning && (
                    <text
                        style={{
                            fg: theme["Blazing Flame"],
                            marginBottom: 1,
                        }}
                    >
                        {warning}
                    </text>
                )}
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
                    <strong style={{ fg: theme["Autumn Ember"] }}>t</strong> run
                    today.{" "}
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
