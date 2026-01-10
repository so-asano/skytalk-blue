"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  // Trim and remove 4+ leading spaces to prevent indented code blocks
  // (only fenced code blocks with ``` are supported)
  const processedContent = children
    .trim()
    .split('\n')
    .map(line => line.replace(/^[ ]{4,}/, ''))
    .join('\n');

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const inline = !match;
            return inline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            ) : (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: "0.375rem" }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
