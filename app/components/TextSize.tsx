import { useEffect, useState } from "react";

export type TextSize = "normal" | "large" | "huge";

const KEY = "laevo:text";

/**
 * Bigger text, on every page, one tap away.
 *
 * This is the single most-used accessibility control in the product, so it
 * lives in the header rather than in a settings page nobody opens. The choice
 * is stored on the device and applied before first paint by a small inline
 * script in the document head, so the page never flashes small text at
 * somebody who cannot read it.
 */
export function TextSizeControl() {
  const [size, setSize] = useState<TextSize>("normal");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY) as TextSize | null;
    if (stored === "large" || stored === "huge") setSize(stored);
  }, []);

  function choose(next: TextSize) {
    setSize(next);
    document.documentElement.dataset.text = next === "normal" ? "" : next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Private browsing. The choice still applies for this visit.
    }
  }

  return (
    <div className="text-size" role="group" aria-label="Text size">
      <button
        type="button"
        className="t-a"
        aria-pressed={size === "normal"}
        onClick={() => choose("normal")}
      >
        A<span className="visually-hidden"> — normal text size</span>
      </button>
      <button
        type="button"
        className="t-b"
        aria-pressed={size === "large"}
        onClick={() => choose("large")}
      >
        A<span className="visually-hidden"> — larger text</span>
      </button>
      <button
        type="button"
        className="t-c"
        aria-pressed={size === "huge"}
        onClick={() => choose("huge")}
      >
        A<span className="visually-hidden"> — largest text</span>
      </button>
    </div>
  );
}

/** Runs before paint so nobody sees a flash of text they cannot read. */
export const TEXT_SIZE_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="large"||t==="huge"){document.documentElement.dataset.text=t}}catch(e){}`;
