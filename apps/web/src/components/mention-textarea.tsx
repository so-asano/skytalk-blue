"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { searchActorsTypeahead } from "@/lib/bsky";
import { useI18n } from "@/lib/i18n";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onChangePlainText?: (plainText: string) => void;
  onHeightChange?: (height: number) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

interface SuggestionItem {
  id: string;
  label: string;
}

interface MentionListProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  noResultsText: string;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command, noResultsText }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    return (
      <div
        style={{
          background: "var(--background, #fff)",
          border: "1px solid var(--border, #e5e7eb)",
          borderRadius: "0.375rem",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          overflow: "hidden",
        }}
      >
        {items.length === 0 ? (
          <div style={{ padding: "8px 12px", fontSize: "14px", color: "#6b7280" }}>
            {noResultsText}
          </div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "14px",
                outline: "none",
                border: "none",
                cursor: "pointer",
                background: index === selectedIndex ? "var(--accent, #f3f4f6)" : "transparent",
              }}
            >
              @{item.label}
            </button>
          ))
        )}
      </div>
    );
  }
);

export function MentionTextarea({
  value,
  onChange,
  onChangePlainText,
  onHeightChange,
  placeholder,
  className,
  maxLength,
}: MentionTextareaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const noResultsText = t("common.noResults");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || "",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "text-primary font-medium",
        },
        suggestion: {
          items: async ({ query }): Promise<SuggestionItem[]> => {
            if (!query) return [];
            const actors = await searchActorsTypeahead(query);
            return actors.map((actor) => ({
              id: actor.handle,
              label: actor.handle,
            }));
          },
          render: () => {
            let component: ReactRenderer | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props: {
                    ...props,
                    noResultsText,
                  },
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate: (props) => {
                component?.updateProps({
                  ...props,
                  noResultsText,
                });

                if (!props.clientRect) return;

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return (component?.ref as MentionListRef | null)?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      if (maxLength && text.length > maxLength) return;
      onChange(editor.getHTML());
      onChangePlainText?.(text);
    },
    editorProps: {
      attributes: {
        class: `min-h-[90px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring ${className || ""}`,
      },
    },
  });

  useEffect(() => {
    if (editor && value === "") {
      editor.commands.clearContent();
    }
  }, [editor, value]);

  useEffect(() => {
    if (!containerRef.current || !onHeightChange) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div ref={containerRef}>
      <EditorContent editor={editor} />
    </div>
  );
}
