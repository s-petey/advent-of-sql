import { useState } from "react";
import type { ContentProps } from "../App";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";
import { Button } from "../components/Button";
import { Footer, Header } from "../components/Layout";
import { TextAttributes } from "@opentui/core";

type ButtonFocus = "watch" | "exit";

export function NewSuccessView({ onQuit, setView }: ContentProps) {
  const [focus, setFocus] = useState<ButtonFocus>("watch");

  useKeyboard((key) => {
    if (key.name === "h" || key.name === "left") {
      setFocus("watch");
      return;
    }

    if (key.name === "l" || key.name === "right") {
      setFocus("exit");
      return;
    }

    if (key.name === "w") {
      setView("watch");
      return;
    }

    if (key.name === "q" || key.name === "escape") {
      onQuit();
      return;
    }

    if (key.name === "return") {
      if (focus === "watch") {
        setView("watch");
      } else {
        onQuit();
      }
      return;
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
          flexDirection: "column",
          gap: 2,
        }}
      >
        <text
          style={{
            fg: theme["Toasted Almond"],
            attributes: TextAttributes.BOLD,
          }}
        >
          File created successfully!
        </text>

        <text
          style={{
            fg: theme.Silver,
          }}
        >
          What would you like to do next?
        </text>

        <box style={{ flexDirection: "row", gap: 2 }}>
          <Button
            style={{
              width: 20,
              justifyContent: "center",
              ...(focus === "watch"
                ? {
                    borderColor: theme["Toasted Almond"],
                  }
                : {}),
            }}
          >
            <text>Watch Mode</text>
          </Button>

          <Button
            style={{
              width: 20,
              justifyContent: "center",
              ...(focus === "exit"
                ? {
                    borderColor: theme["Toasted Almond"],
                  }
                : {}),
            }}
          >
            <text>Exit</text>
          </Button>
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
            &#8592; | h
          </strong>{" "}
          or{" "}
          <strong
            style={{
              fg: theme["Autumn Ember"],
            }}
          >
            &#8594; | l
          </strong>{" "}
          to navigate,{" "}
          <strong
            style={{
              fg: theme["Autumn Ember"],
            }}
          >
            Return
          </strong>{" "}
          to select,{" "}
          <strong
            style={{
              fg: theme["Autumn Ember"],
            }}
          >
            w
          </strong>{" "}
          for watch mode, or{" "}
          <strong
            style={{
              fg: theme["Autumn Ember"],
            }}
          >
            q | Esc
          </strong>{" "}
          to exit.
        </text>
      </Footer>
    </>
  );
}
