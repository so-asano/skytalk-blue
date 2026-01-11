"use client";

import { useState, useEffect } from "react";
import { useFloating, flip, shift, offset, useClick, useDismiss, useInteractions } from "@floating-ui/react";
import { Smile } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "@/lib/theme";

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPickerButton({ onSelect }: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (theme === "system") {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      setIsDark(theme === "dark");
    }
  }, [theme, isOpen]);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top-start",
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ["bottom-start", "top-end", "bottom-end"] }),
      shift({ padding: 8 }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="ml-1 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
        title="React"
      >
        <Smile className="w-3.5 h-3.5" />
      </button>
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="z-50"
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji: { native: string }) => {
              onSelect(emoji.native);
              setIsOpen(false);
            }}
            theme={isDark ? "dark" : "light"}
          />
        </div>
      )}
    </>
  );
}
