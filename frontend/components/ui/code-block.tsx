"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cva } from "class-variance-authority";

const customSyntaxTheme = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: "hsl(var(--muted))",
    borderRadius: "0.5rem",
    fontFamily: "Geist Mono, monospace",
    textShadow: "none",
    padding: 0,
    margin: 0,
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: "none",
    fontFamily: "Geist Mono, monospace",
    textShadow: "none",
    fontSize: "13px",
    padding: 0,
  },
};

const codeBlockVariants = cva("text-card-foreground rounded-xl p-4 flex flex-col gap-2", {
  variants: {
    variant: {
      flat: "bg-muted",
      default: "border border-border bg-card",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type CodeBlockProps = {
  code: string;
  language?: string;
  theme?: string;
  className?: string;
  title?: string;
  children?: React.ReactNode;
  variant?: "default" | "flat";
} & React.HTMLProps<HTMLDivElement>;

export function CodeBlock({
  code,
  language = "tsx",
  theme = "github-light",
  className,
  title,
  children,
  variant = "default",
  ...props
}: CodeBlockProps) {
  const codeClassNames = cn("w-full overflow-x-auto text-[13px] font-mono");
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("relative group", codeBlockVariants({ variant }), className)} {...props}>
      <Button
        onClick={() => {
          navigator.clipboard.writeText(String(code));
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, 1000);
        }}
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 focus-visible:ring-0 bg-card text-muted-foreground hover:bg-muted active:bg-muted"
        aria-label={copied ? "Copied" : "Copy to clipboard"}
      >
        <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
        <Copy
          className={`size-4 transition-all duration-300 ${copied ? "scale-0" : "scale-100"}`}
        />
        <Check
          className={`absolute inset-0 m-auto size-4 transition-all duration-300 text-emerald-500 ${
            copied ? "scale-100" : "scale-0"
          }`}
        />
      </Button>
      {title && <h3 className="text-sm text-muted-foreground tracking-tight font-mono">{title}</h3>}
      <SyntaxHighlighter
        language={language}
        style={customSyntaxTheme}
        PreTag="div"
        className={codeClassNames}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
