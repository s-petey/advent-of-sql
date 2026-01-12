import { useCallback, useState } from "react";
import type { ContentProps } from "../App";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";
import { Footer, Header } from "../components/Layout";
import { KeyEvent, TextAttributes } from "@opentui/core";

export function NewView({ onQuit, focus, setFocus, setView }: ContentProps) {
    const today = new Date();
    const [inputFocus, setInputFocus] = useState<"day" | "year">("day");
    const [day, setDay] = useState(today.getDate().toString());
    const [year, setYear] = useState(today.getFullYear().toString());
    const [error, setError] = useState<{
        message: string;
        fields: ("day" | "year")[];
    }>();

    useKeyboard((key) => {
        if (key.name === "tab") {
            return setInputFocus((prev) => (prev === "day" ? "year" : "day"));
        }

        if (key.name === "q" || key.name === "escape") {
            return setView(null);
        }
        
        if (key.name === "up") {
            if (inputFocus === "day") {
                return setDay((prev) => {
                    const maybeDay = Number(prev);
                    if (Number.isNaN(maybeDay)) {
                        return "0";
                    }

                    return (maybeDay + 1).toString();
                });
            }
        }
    });

    function handleSetDay(newDay: string) {
        if (newDay === "h") {
            setDay("");
            return setInputFocus("year");
        }

        if (newDay.endsWith("k")) {
            return setDay((prev) => {
                const maybeDay = Number(prev);
                if (Number.isNaN(maybeDay)) {
                    return "0";
                }

                return (maybeDay + 1).toString();
            });
        }

        return setDay(newDay);
    }

    const handleSubmit = useCallback(() => {
        // TODO: Parse numbers and show error if invalid
        // otherwise create file and set top level day / year
        const maybeDay = Number(day);
        const maybeYear = Number(year);
        let errorMessage: string | null = null;
        const errorFields: ("day" | "year")[] = [];

        if (Number.isNaN(maybeDay)) {
            errorMessage = "Day is an invalid number";
            errorFields.push("day");
        }
        if (Number.isNaN(maybeYear)) {
            if (errorMessage !== null) {
                errorMessage += " and Year is an invalid number";
            } else {
                errorMessage = "Year is an invalid number";
            }
            errorFields.push("year");
        }

        if (errorFields.length > 0 && errorMessage !== null) {
            setError({
                fields: errorFields,
                message: errorMessage,
            });
            return;
        }

        // TODO: Finish logic
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
                    <box
                        border
                        title="Day"
                        style={{
                            width: 20,
                            height: 3,
                            borderColor: theme.Silver,
                        }}
                    >
                        <input
                            placeholder="Day of file..."
                            onChange={handleSetDay}
                            onSubmit={handleSubmit}
                            focused={inputFocus === "day"}
                        />
                    </box>
                    <box
                        border
                        title="Year"
                        style={{
                            width: 40,
                            height: 3,
                            borderColor: theme.Silver,
                        }}
                    >
                        <input
                            placeholder="Year of file..."
                            onInput={setYear}
                            onSubmit={handleSubmit}
                            focused={inputFocus === "year"}
                        />
                    </box>
                </box>

                {error?.fields.length ? (
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
                                &#8593; | k
                            </strong>{" "}
                            to increment value, or{" "}
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
