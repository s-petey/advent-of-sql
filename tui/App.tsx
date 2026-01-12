import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Footer, Header, Layout } from "./components/Layout";
import { theme } from "./theme";
import { StartView } from "./views/Start";
import { NewView } from "./views/New";

export interface AppProps {
    onQuit: () => void;
}

interface TableProps extends AppProps {
    day: number;
    year: number;
}

export type Actions = "new" | "watch" | "run";
export const ACTIONS: Actions[] = ["new", "run", "watch"];

export function App({ onQuit }: AppProps) {
    const [focus, setFocus] = useState<Actions>("new");
    const [view, setView] = useState<Actions | null>(null);

    return (
        <Layout>
            <Content
                view={view}
                focus={focus}
                setFocus={setFocus}
                setView={setView}
                onQuit={onQuit}
            />
        </Layout>
    );
}

export interface ContentProps extends AppProps {
    setFocus: Dispatch<SetStateAction<Actions>>;
    setView: Dispatch<SetStateAction<Actions | null>>;
    focus: Actions;
    view: Actions | null;
}

function Content({ onQuit, view, focus, setFocus, setView }: ContentProps) {
    switch (view) {
        case "new":
            return (
                <NewView
                    view={view}
                    focus={focus}
                    setFocus={setFocus}
                    setView={setView}
                    onQuit={onQuit}
                />
            );
        case "run":
        case "watch":
            return <text>WIP</text>;
    }

    return (
        <StartView
            view={view}
            focus={focus}
            setFocus={setFocus}
            setView={setView}
            onQuit={onQuit}
        />
    );
}

export function TableView({ day, year, onQuit }: TableProps) {
    // FIXME: I'm a work-around for not passing values...
    const date = new Date();
    year = year ?? date.getFullYear();
    day = day ?? date.getDate();

    // TODO: Get the day / year of the running appplication date from
    // parent render
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
        // // Only handle navigation in list mode
        // if (mode !== "list") return
        // switch (key.name) {
        //   case "up":
        //   case "k":
        //     setSelectedIndex(Math.max(0, selectedIndex - 1))
        //     break
        //   case "down":
        //   case "j":
        //     setSelectedIndex(Math.min(repos.length - 1, selectedIndex + 1))
        //     break
        //   case "a":
        //     setMode("add")
        //     break
        //   case "d":
        //     handleRequestDelete()
        //     break
        //   case "s":
        //     if (key.shift) {
        //       handleSyncAll()
        //     } else {
        //       handleSyncRepo()
        //     }
        //     break
        //   case "/":
        //     setMode("search")
        //     break
        //   case "c":
        //     handleCopyMcpConfig()
        //     break
        // }
    });

    const rows = Array.from({ length: 1000 }).map((_, i) => [
        `Row ${i + 1} Col 1`,
        `Row ${i + 1} Col 2`,
        `Row ${i + 1} Col 3`,
    ]);
    const columns = ["Column 1", "Column 2", "Column 3"];

    return (
        <Layout>
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
            <Scroller columns={columns} rows={rows} />
            <Footer>
                <text
                    style={{
                        fg: theme["Autumn Ember"],
                        ...(rows.length
                            ? { attributes: TextAttributes.BOLD }
                            : {}),
                    }}
                >
                    {rows.length ? `Total Rows: ${rows.length}` : ""}
                </text>

                <text
                    style={{
                        fg: theme.Silver,
                    }}
                >
                    {/* TODO: Full commands here */}
                    Press
                    <strong
                        style={{
                            fg: theme["Autumn Ember"],
                        }}
                    >
                        q
                    </strong>{" "}
                    to quit | Use arrow keys to navigate
                </text>
            </Footer>
        </Layout>
    );
}

function Scroller({ columns, rows }: { columns: string[]; rows: string[][] }) {
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
                    <text key={col}>{col}</text>
                ))}
            </box>

            <scrollbox
                style={{
                    //     rootOptions: {
                    //       backgroundColor: "#24283b",
                    //     },
                    //     wrapperOptions: {
                    //       backgroundColor: "#1f2335",
                    //     },
                    //     viewportOptions: {
                    //       backgroundColor: "#1a1b26",
                    //     },
                    //     contentOptions: {
                    //       backgroundColor: "#16161e",
                    //     },
                    scrollbarOptions: {
                        showArrows: true,
                        // trackOptions: {
                        //   foregroundColor: "#7aa2f7",
                        //   backgroundColor: "#414868",
                        // },
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
                            <text key={j}>{cell}</text>
                        ))}
                    </box>
                ))}
            </scrollbox>
        </box>
    );
}
