import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/ui/code-block";
import { Button } from "@/components/ui/button";

const components: Components = {
  // Text components
  p: ({ children }) => <p className="text-base mb-3 last:mb-0">{children}</p>,
  h1: ({ children }) => (
    <h1 className="text-4xl font-semibold tracking-tight mb-4 mt-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-semibold tracking-tight mt-4 mb-2 border-b border-border pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-2xl font-semibold tracking-tight mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-xl font-semibold tracking-tight mt-3 mb-2">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-lg font-semibold tracking-tight mt-2 mb-1">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-base font-semibold tracking-tight mt-2 mb-1">{children}</h6>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="text-base my-2 pl-6 list-disc marker:text-primary/70">{children}</ul>
  ),
  ol: ({ children }) => <ol className="text-base my-2 pl-6 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,

  // Inline formatting
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through">{children}</del>,

  // Block elements
  blockquote: ({ children }) => (
    <blockquote className="pl-4 border-l-4 border-primary/20 my-2 italic text-primary/70">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-t border-border" />,

  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full divide-y divide-border border border-border">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 whitespace-nowrap text-sm">{children}</td>,

  // Links and images
  a: ({ children, href, title }) => (
    <Button
      variant="link"
      size="sm"
      className="text-primary hover:underline p-0 m-0"
      title={title}
      onClick={() => {
        if (href) {
          window.open(href, "_blank", "noopener noreferrer");
        }
      }}
      disabled={!href}
      asChild
    >
      {children}
    </Button>
  ),
  img: ({ src, alt, title }) => (
    <div className="flex flex-col items-center w-fit">
      <img
        src={src || ""}
        alt={alt || ""}
        title={title || alt || ""}
        className="max-w-sm h-auto my-2 rounded-xl"
      />
      <p className="text-sm text-center text-muted-foreground">{alt}</p>
    </div>
  ),

  // Code blocks and inline code
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match;
    return !isInline && match ? (
      <CodeBlock code={String(children).replace(/\n$/, "")} language={match[1]} />
    ) : (
      <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm text-primary font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export default function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
