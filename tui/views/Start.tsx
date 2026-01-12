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
                }
            });
        }

        if (key.name === "return") {
            return setView(focus);
        }

        switch (key.name) {
            case "n":
                return setFocus("new");
            case "r":
                return setFocus("run");
            case "w":
                return setFocus("watch");
            case "h":
                return setFocus((prev) => {
                    switch (prev) {
                        case "new":
                            return "watch";
                        case "run":
                            return "new";
                        case "watch":
                            return "run";
                    }
                });

            case "l":
                return setFocus((prev) => {
                    switch (prev) {
                        case "new":
                            return "run";
                        case "run":
                            return "watch";
                        case "watch":
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
                    Use{" "}
                    <strong
                        style={{
                            fg: theme["Autumn Ember"],
                        }}
                    >
                        Tab
                    </strong>{" "}
                    to switch or{" "}
                    <strong
                        style={{
                            fg: theme["Autumn Ember"],
                        }}
                    >
                        Return
                    </strong>{" "}
                    to select an action, or jump between them using{" "}
                    <strong
                        style={{
                            fg: theme["Autumn Ember"],
                        }}
                    >
                        {ACTIONS.map((v) => v.slice(0, 1)).join(" | ")}
                    </strong>
                </text>
            </Footer>
        </>
    );
}
