import type { PropsWithChildren } from "react";
import { theme } from "../theme";

export function Layout({ children }: PropsWithChildren) {
  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: theme["Shadow Grey"],
      }}
    >
      {children}
    </box>
  );
}

export const Header = ({ children }: PropsWithChildren) => {
  return (
    <box
      border
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 4,
        padding: 1,
        borderColor: theme["Toasted Almond"],
      }}
    >
      {children}
    </box>
  );
};

export const Footer = ({ children }: PropsWithChildren) => {
  return (
    <box
      style={{
        padding: 1,
        borderStyle: "single",
        borderColor: theme["Toasted Almond"],
        border: true,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      {children}
    </box>
  );
};
