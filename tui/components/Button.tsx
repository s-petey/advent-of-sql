import type { BoxProps } from "@opentui/react";
import type { PropsWithChildren } from "react";

export function Button({ children, ...boxProps }: PropsWithChildren<BoxProps>) {
  return (
    <box
      {...boxProps}
      style={{
        paddingLeft: 1,
        paddingRight: 1,
        ...boxProps.style,
        //
      }}
      border
    >
      {children}
    </box>
  );
}
