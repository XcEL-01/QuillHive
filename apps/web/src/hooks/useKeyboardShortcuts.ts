import { useEffect } from "react";

export function useKeyboardShortcuts(callbacks: {
  onOpenCreate?: () => void;
  onFocusSearch?: () => void;
}) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[data-lexical-editor]") !== null;

      if (isEditing) return;

      switch (e.key) {
        case "n":
        case "N":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            callbacks.onOpenCreate?.();
          }
          break;
        case "/":
          e.preventDefault();
          callbacks.onFocusSearch?.();
          break;
        case "Escape":
          document.dispatchEvent(new CustomEvent("qh:close-modal"));
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callbacks]);
}