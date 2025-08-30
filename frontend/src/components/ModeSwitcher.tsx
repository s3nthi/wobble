import { useState } from "react";
import PlayAgainst from "../components/PlayAgainst";
import TestBot from "../components/TestBot";

export default function ModeSwitcher() {
  const [mode, setMode] = useState<"play" | "test">("play");

  return (
    <>
      <div
        id="mode-switcher"
        className="my-8 mx-auto flex flex-col items-center justify-center gap-4 md:flex-row"
      >
        <label className="cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="play"
            checked={mode === "play"}
            className="sr-only peer"
            onChange={() => setMode("play")}
          />
          <span className="px-6 py-2 h-10 rounded-full font-semibold transition-all duration-300 peer-checked:bg-sec-bg peer-checked:text-fg text-ter-fg peer-checked:shadow-sm">
            Play against the bot
          </span>
        </label>
        <label className="cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="test"
            checked={mode === "test"}
            className="sr-only peer"
            onChange={() => setMode("test")}
          />
          <span className="px-6 py-2 h-10 rounded-full font-semibold transition-all duration-300 peer-checked:bg-sec-bg peer-checked:text-fg text-ter-fg peer-checked:shadow-sm">
            Test the bot
          </span>
        </label>
      </div>

      <div id="mode-content" className="my-8">
        {mode === "play" && <PlayAgainst />}
        {mode === "test" && <TestBot />}
      </div>
    </>
  );
}
