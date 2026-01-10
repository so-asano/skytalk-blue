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
    <div className={`break-words ${className || ""}`} style={{ overflowWrap: "anywhere" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children, ...props }) {
            return <div className="my-4 first:mt-0 last:mb-0" {...props}>{children}</div>;
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, inline, ...props }) {
            const match = /language-(\w+)/.exec(className || "");

            if (inline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match?.[1] || "text"}
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
