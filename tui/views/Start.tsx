import { TextAttributes } from "@opentui/core";
import { ACTIONS, type ContentProps } from "../App";
import { Button } from "../components/Button";
import { Footer, Header } from "../components/Layout";
import { theme } from "../theme";
import { useKeyboard } from "@opentui/react";

export function StartView({ onQuit, focus, setFocus, setView }: ContentProps) {
    useKeyboard((key) => {
        // Handle escape/quit in any mode
        if (
            key.name === "escape" ||
            // (
            key.name === "q"
            //  && mode === "list"
            // )
        ) {
            //   if (mode === "add" || mode === "search") {
            //     setMode("list");
            //     setInputValue("");
            //   } else if (mode === "results") {
            //     handleCloseResults();
            //   } else if (mode === "confirmDelete") {
            //     handleCancelDelete();
            //   } else if (mode === "list") {
            onQuit();
            //   }
            return;
        }

        if (key.name === "tab") {
            return setFocus((curr) => {
                switch (curr) {
                    case "new":
                        return "run";
                    case "run":
                        return "watch";
                    case "watch":
                        return "new";
                    default:
                        return "new";
                }
            });
        }

        if (key.name === "return") {
            return setView(focus);
        }

        switch (key.name) {
            case "n":
                setFocus("new");
                setView("new");
                return;
            case "r":
                setFocus("run");
                setView("run");
                return;
            case "w":
                setFocus("watch");
                setView("watch");
                return;
            case "h":
            case "left":
                return setFocus((prev) => {
                    switch (prev) {
                        case "new":
                            return "watch";
                        case "run":
                            return "new";
                        case "watch":
                            return "run";
                        default:
                            return "new";
                    }
                });

            case "l":
            case "right":
                return setFocus((prev) => {
                    switch (prev) {
                        case "new":
                            return "run";
                        case "run":
                            return "watch";
                        case "watch":
                            return "new";
                        default:
                            return "new";
                    }
                });
        }
    });
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
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <text
                    style={{
                        fg: theme.Silver,
                    }}
                >
                    What action would you like to take?
                </text>

                <box style={{ flexDirection: "row", gap: 2 }}>
                    {ACTIONS.map((action) => (
                        <Button
                            style={{
                                ...(focus === action
                                    ? {
                                          borderColor: theme["Toasted Almond"],
                                      }
                                    : {}),
                            }}
                            onKeyDown={(e) => {}}
                        >
                            <text>{action}</text>
                        </Button>
                    ))}
                </box>
            </box>

            <Footer>
                <text
                    style={{
                        fg: theme.Silver,
                    }}
                >
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        h l
                    </strong>{" "}
                    or{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        Arrow keys
                    </strong>{" "}
                    to navigate.{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        Enter
                    </strong>{" "}
                    to select.{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        n
                    </strong>{" "}
                    new{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        r
                    </strong>{" "}
                    run{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        w
                    </strong>{" "}
                    watch.{" "}
                    <strong style={{ fg: theme["Autumn Ember"] }}>
                        q
                    </strong>{" "}
                    to quit.
                </text>
            </Footer>
        </>
    );
}
