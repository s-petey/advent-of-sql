import { useCallback, useState } from "react";
import type { ContentProps } from "../App";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";
import { Button } from "../components/Button";
import { Footer, Header } from "../components/Layout";
import { TextAttributes } from "@opentui/core";
import { DateTime, Effect } from "effect";
import { cliRuntime, CliTools } from "../runtime";

// Tagged error result types for better error handling
type CreateFileSuccess = { readonly _tag: "Success" };
type CreateFileErrorResult =
    | { readonly _tag: "FileExists"; readonly path: string }
    | { readonly _tag: "FileCreation"; readonly message: string }
    | { readonly _tag: "UnknownError"; readonly message: string };

type CreateFileResult = CreateFileSuccess | CreateFileErrorResult;

type ErrorFields = "day" | "year";
type Day = [number, number];
type Year = [number, number, number, number];

function getYearTouple(dateToUse: Date) {
    const [one = 0, two = 0, three = 0, four = 0] = dateToUse
        .getFullYear()
        .toString()
        .split("")
        .map(Number);

    return [one, two, three, four] satisfies Year;
}

function getDayTouple(dateToUse: Date) {
    const [one = 0, two = 0] = dateToUse
        .getDate()
        .toString()
        .split("")
        .map(Number);

    return [one, two] satisfies Day;
}

export function NewView({ onQuit, focus, setFocus, setView }: ContentProps) {
    const today = new Date();
    const [inputFocus, setInputFocus] = useState<"day" | "year">("day");
    const [day, setDay] = useState(getDayTouple(today));
    const [year, setYear] = useState<Year>(getYearTouple(today));
    const [error, setError] = useState<{
        message: string;
        fields: ErrorFields[];
    }>();
    const [yearIdx, setYearIdx] = useState<0 | 1 | 2 | 3>(0);
    const [dayIdx, setDayIdx] = useState<0 | 1>(0);

    useKeyboard((key) => {
        if (key.name === "return") {
            handleSubmit();
            return;
        }

        if (key.name === "tab") {
            return setInputFocus((prev) => {
                if (prev === "day") {
                    setYearIdx(0);
                    return "year";
                }
                setDayIdx(0);
                return "day";
            });
        }

        if (key.name === "q" || key.name === "escape") {
            return setView(null);
        }

        if (key.name === "r") {
            setYear(getYearTouple(today));
            setDay(getDayTouple(today));
            return;
        }

        if (key.name === "l" || key.name === "right") {
            if (inputFocus === "day") {
                return setDayIdx((prev) => (prev === 0 ? 1 : 0));
            }

            if (inputFocus === "year") {
                return setYearIdx((prev) => {
                    switch (prev) {
                        case 0:
                            return 1;
                        case 1:
                            return 2;
                        case 2:
                            return 3;
                        case 3:
                            return 0;
                    }
                });
            }
        }

        if (key.name === "h" || key.name === "left") {
            if (inputFocus === "day") {
                return setDayIdx((prev) => (prev === 0 ? 1 : 0));
            }

            if (inputFocus === "year") {
                return setYearIdx((prev) => {
                    switch (prev) {
                        case 0:
                            return 3;
                        case 1:
                            return 0;
                        case 2:
                            return 1;
                        case 3:
                            return 2;
                    }
                });
            }
        }

        if (key.name === "up" || key.name === "k") {
            if (inputFocus === "day") {
                return setDay((prev) => {
                    const copiedDay: Day = [...prev];
                    let part = 9;
                    if (dayIdx === 0) {
                        part = Math.min((copiedDay[dayIdx] ?? 0) + 1, 3);
                    } else {
                        part = Math.min((copiedDay[dayIdx] ?? 0) + 1, 9);
                    }

                    copiedDay.splice(dayIdx, 1, part);
                    return copiedDay;
                });
            }

            if (inputFocus === "year") {
                return setYear((prev) => {
                    const copiedYear: Year = [...prev];
                    const part = Math.min((copiedYear[yearIdx] ?? 0) + 1, 9);
                    copiedYear.splice(yearIdx, 1, part);
                    return copiedYear;
                });
            }
        }

        if (inputFocus === "year") {
            if (key.name === "down" || key.name === "j") {
                return setYear((prev) => {
                    const copiedYear: Year = [...prev];
                    const part = Math.max((copiedYear[yearIdx] ?? 1) - 1, 0);

                    copiedYear.splice(yearIdx, 1, part);
                    return copiedYear;
                });
            }

            if (key.name === "backspace") {
                return setYear((prev) => {
                    const copiedYear: Year = [...prev];
                    copiedYear.splice(yearIdx, 1, 0);

                    return copiedYear;
                });
            }

            const maybeNumber = Number(key.name);
            if (!Number.isNaN(maybeNumber)) {
                return setYear((prev) => {
                    const copiedYear: Year = [...prev];
                    copiedYear.splice(yearIdx, 1, maybeNumber);
                    return copiedYear;
                });
            }
        }

        if (inputFocus === "day") {
            if (key.name === "down" || key.name === "j") {
                return setDay((prev) => {
                    const copiedDay: Day = [...prev];
                    let part = 9;
                    if (dayIdx === 0) {
                        part = Math.max((copiedDay[dayIdx] ?? 0) - 1, 0);
                    } else {
                        part = Math.max((copiedDay[dayIdx] ?? 0) - 1, 0);
                    }

                    copiedDay.splice(dayIdx, 1, part);
                    return copiedDay;
                });
            }

            if (key.name === "backspace") {
                return setDay((prev) => {
                    const copiedDay: Day = [...prev];
                    copiedDay.splice(dayIdx, 1, 0);

                    return copiedDay;
                });
            }

            const maybeNumber = Number(key.name);
            if (!Number.isNaN(maybeNumber)) {
                return setDay((prev) => {
                    const copiedDay: Day = [...prev];
                    let part = 9;
                    if (dayIdx === 0) {
                        part = Math.min(maybeNumber, 3);
                    } else {
                        part = Math.min(maybeNumber, 9);
                    }

                    copiedDay.splice(dayIdx, 1, part);
                    return copiedDay;
                });
            }
        }
    });

    const handleSubmit = useCallback(async () => {
        // TODO: Parse numbers and show error if invalid
        // otherwise create file and set top level day / year
        // const maybeDay = Number(day);
        // const maybeYear = Number(year);
        let errorMessage: string | null = null;
        const errorFields = isValidDayYear(
            Number(year.join("")),
            Number(day.join("")),
        );

        // FIXME: Validate date using effect?

        if (errorFields.includes("day")) {
            errorMessage = "Day is an invalid number";
        }
        if (errorFields.includes("year")) {
            if (errorMessage !== null) {
                errorMessage += " and Year is an invalid number";
            } else {
                errorMessage = "Year is an invalid number";
            }
        }

        if (errorFields.length > 0 && errorMessage !== null) {
            setError({
                fields: errorFields,
                message: errorMessage,
            });
            return;
        }

        setError({
            fields: [],
            message: "",
        });

        // Use the CliTools service from the runtime
        // The service is already provided by cliRuntime's layer
        const result: CreateFileResult = await cliRuntime.runPromise(
            Effect.gen(function* () {
                // Yield the CliTools service - it's automatically available
                // because cliRuntime was created with CliTools.Default layer
                const cliTools = yield* CliTools;

                yield* cliTools.createFile({
                    day: Number(day.join("")),
                    year: Number(year.join("")),
                });

                return { _tag: "Success" } as const;
            }).pipe(
                // Handle specific error types with their tags
                Effect.catchTag("FileExistsError", (error) =>
                    Effect.succeed({
                        _tag: "FileExists",
                        path: error.path,
                    } as const),
                ),
                Effect.catchTag("FileCreationError", (error) =>
                    Effect.succeed({
                        _tag: "FileCreation",
                        message: error.message,
                    } as const),
                ),
                // Catch any remaining errors
                Effect.catchAll((error) =>
                    Effect.succeed({
                        _tag: "UnknownError",
                        message:
                            error instanceof Error
                                ? error.message
                                : "An unexpected error occurred",
                    } as const),
                ),
            ),
        );

        if (result._tag !== "Success") {
            let errorMessage: string;
            switch (result._tag) {
                case "FileExists":
                    errorMessage = `File already exists: ${result.path}`;
                    break;
                case "FileCreation":
                    errorMessage = `Failed to create file: ${result.message}`;
                    break;
                case "UnknownError":
                    errorMessage = `Unexpected error: ${result.message}`;
                    break;
            }
            setError({
                fields: [],
                message: errorMessage,
            });
            return;
        }

        // Navigate to success page
        setView("newSuccess");
    }, [day, year]);

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
                    gap: 2,
                }}
                border
            >
                <box
                    style={{
                        flexDirection: "row",
                        gap: 2,
                        justifyContent: "center",
                        alignItems: "space-evenly",
                    }}
                >
                    <Button
                        title="Day"
                        style={{
                            flexDirection: "row",
                            width: 20,
                            height: 3,
                            borderColor:
                                inputFocus === "day"
                                    ? theme["Toasted Almond"]
                                    : theme.Silver,
                        }}
                    >
                        {day.map((char, idx) => (
                            <text
                                key={`${idx}-${char}`}
                                fg={
                                    dayIdx === idx
                                        ? theme["Autumn Ember"]
                                        : "white"
                                }
                            >
                                {char}
                            </text>
                        ))}
                    </Button>

                    <Button
                        title="Year"
                        style={{
                            flexDirection: "row",
                            width: 40,
                            height: 3,
                            borderColor:
                                inputFocus === "year"
                                    ? theme["Toasted Almond"]
                                    : theme.Silver,
                        }}
                    >
                        {year.map((char, idx) => (
                            <text
                                key={`${idx}-${char}`}
                                fg={
                                    yearIdx === idx
                                        ? theme["Autumn Ember"]
                                        : "white"
                                }
                            >
                                {char}
                            </text>
                        ))}
                    </Button>
                </box>

                {typeof error?.message === "string" ? (
                    <box
                        style={{
                            flexDirection: "row",
                            justifyContent: "center",
                        }}
                    >
                        <text
                            style={{
                                fg: theme["Blazing Flame"],
                            }}
                        >
                            {error.message}
                        </text>
                    </box>
                ) : null}
            </box>

            {/*TODO: Maybe make this into a commands table?*/}
            <Footer>
                <box style={{ flexDirection: "column" }}>
                    <box style={{ flexDirection: "row" }}>
                        <text
                            style={{
                                fg: theme.Silver,
                            }}
                        >
                            Use{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                Tab
                            </strong>{" "}
                            to switch inputs,{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                Return
                            </strong>{" "}
                            to submit, or{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                q | Esc
                            </strong>{" "}
                            to return home.
                        </text>
                    </box>

                    <box style={{ flexDirection: "row" }}>
                        <text
                            style={{
                                fg: theme.Silver,
                            }}
                        >
                            Use{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                R
                            </strong>{" "}
                            to reset inputs,{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                &#8592; | h
                            </strong>{" "}
                            to move cursor left,{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                &#8594; | l
                            </strong>{" "}
                            to cursor right,{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                &#8593; | k
                            </strong>{" "}
                            to increment value,{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                &#8595; | j
                            </strong>{" "}
                            to decrement value, or{" "}
                            <strong
                                style={{
                                    fg: theme["Autumn Ember"],
                                }}
                            >
                                q | Esc
                            </strong>{" "}
                            to return home.
                        </text>
                    </box>
                </box>
            </Footer>
        </>
    );
}

const DECEMBER = 12;
const isValidDayYear = (year: number, day: number): ErrorFields[] => {
    // DateTime.unsafeMake will roll over invalid dates (e.g. Feb 30 -> Mar 2)
    const date = DateTime.unsafeMake({ year, month: DECEMBER, day });

    // Convert back to parts to see what the date actually resolved to
    const parts = DateTime.toParts(date);

    const errors: ErrorFields[] = [];

    if (parts.year !== year) {
        errors.push("year");
    }

    if (parts.day !== day) {
        errors.push("day");
    }

    return errors;
};
