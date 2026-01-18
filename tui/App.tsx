import { useState, type Dispatch, type SetStateAction } from "react";
import { Layout } from "./components/Layout";
import { StartView } from "./views/Start";
import { NewView } from "./views/New";
import { NewSuccessView } from "./views/NewSuccess";
import { WatchView } from "./views/Watch";
import { WatchDayView } from "./views/WatchDay";

export interface AppProps {
  onQuit: () => void;
}

export type Actions = "new" | "watch" | "newSuccess" | "watchDay";
export const ACTIONS: Actions[] = ["new", "watch"];

export interface SelectedDay {
  day: number;
  year: number;
}

export interface ContentProps extends AppProps {
  setFocus: Dispatch<SetStateAction<Actions>>;
  setView: Dispatch<SetStateAction<Actions | null>>;
  setSelectedDay: Dispatch<SetStateAction<SelectedDay | null>>;
  focus: Actions;
  view: Actions | null;
  selectedDay: SelectedDay | null;
}

export function App({ onQuit }: AppProps) {
  const [focus, setFocus] = useState<Actions>("new");
  const [view, setView] = useState<Actions | null>(null);
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  return (
    <Layout>
      <Content
        view={view}
        focus={focus}
        setFocus={setFocus}
        setView={setView}
        setSelectedDay={setSelectedDay}
        selectedDay={selectedDay}
        onQuit={onQuit}
      />
    </Layout>
  );
}

function Content({
  onQuit,
  view,
  focus,
  setFocus,
  setView,
  setSelectedDay,
  selectedDay,
}: ContentProps) {
  switch (view) {
    case "new":
      return (
        <NewView
          view={view}
          focus={focus}
          setFocus={setFocus}
          setView={setView}
          setSelectedDay={setSelectedDay}
          selectedDay={selectedDay}
          onQuit={onQuit}
        />
      );
    case "newSuccess":
      return (
        <NewSuccessView
          view={view}
          focus={focus}
          setFocus={setFocus}
          setView={setView}
          setSelectedDay={setSelectedDay}
          selectedDay={selectedDay}
          onQuit={onQuit}
        />
      );
    case "watch":
      return (
        <WatchView
          view={view}
          focus={focus}
          setFocus={setFocus}
          setView={setView}
          setSelectedDay={setSelectedDay}
          selectedDay={selectedDay}
          onQuit={onQuit}
        />
      );
    case "watchDay":
      if (selectedDay) {
        return (
          <WatchDayView
            view={view}
            focus={focus}
            setFocus={setFocus}
            setView={setView}
            setSelectedDay={setSelectedDay}
            selectedDay={selectedDay}
            onQuit={onQuit}
          />
        );
      }
      // Fall through to watch if no day selected
      return (
        <WatchView
          view={view}
          focus={focus}
          setFocus={setFocus}
          setView={setView}
          setSelectedDay={setSelectedDay}
          selectedDay={selectedDay}
          onQuit={onQuit}
        />
      );
  }

  return (
    <StartView
      view={view}
      focus={focus}
      setFocus={setFocus}
      setView={setView}
      setSelectedDay={setSelectedDay}
      selectedDay={selectedDay}
      onQuit={onQuit}
    />
  );
}
