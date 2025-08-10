"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Folder as FolderIcon,
  File as FileIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  FileCode as FileCodeIcon,
  FileType2 as FilePdfIcon,
} from "lucide-react";

export type FilesAppProps = React.HTMLAttributes<HTMLDivElement>;

type DirEntry = { name: string; kind: "file" | "directory" };

function shellQuote(token: string): string {
  return `'${token.replace(/'/g, "'\\''")}'`;
}

async function terminalCall(params: { command: string; cwd: string }): Promise<{
  stdout?: string[];
  cwd?: string;
  error?: string;
}> {
  const res = await fetch("/api/terminal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("terminal request failed");
  return (await res.json()) as { stdout?: string[]; cwd?: string; error?: string };
}

function parseLsOnePerLine(lines: string[] | undefined): DirEntry[] {
  const items = (lines ?? [])
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map<DirEntry>((name) => {
      if (name.endsWith("/")) return { name: name.slice(0, -1), kind: "directory" };
      return { name, kind: "file" };
    });
  items.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "directory" ? -1 : 1
  );
  return items;
}

function getExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

type IconComponent = React.ComponentType<{ size?: string | number; className?: string }>;

function classifyEntry(
  entry: DirEntry
):
  | { kind: "directory"; icon: IconComponent; bg: string; fg: string }
  | { kind: "file"; icon: IconComponent; bg: string; fg: string } {
  if (entry.kind === "directory") {
    return { kind: "directory", icon: FolderIcon, bg: "bg-sky-500/15", fg: "text-sky-600" };
  }
  const ext = getExtension(entry.name);
  const imageExt = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);
  const codeExt = new Set([
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "py",
    "go",
    "rs",
    "java",
    "cs",
    "rb",
    "php",
    "sh",
    "yml",
    "yaml",
  ]);
  const textExt = new Set(["txt", "md", "markdown", "log", "csv"]);
  if (ext === "pdf")
    return { kind: "file", icon: FilePdfIcon, bg: "bg-rose-500/15", fg: "text-rose-600" };
  if (imageExt.has(ext))
    return { kind: "file", icon: ImageIcon, bg: "bg-emerald-500/15", fg: "text-emerald-600" };
  if (codeExt.has(ext))
    return { kind: "file", icon: FileCodeIcon, bg: "bg-violet-500/15", fg: "text-violet-600" };
  if (textExt.has(ext))
    return { kind: "file", icon: FileTextIcon, bg: "bg-stone-500/10", fg: "text-stone-600" };
  return { kind: "file", icon: FileIcon, bg: "bg-stone-500/10", fg: "text-stone-600" };
}

function joinPath(base: string, part: string): string {
  if (base === "/") return `/${part}`;
  return `${base}/${part}`;
}

export function FilesApp({ className, ...props }: FilesAppProps) {
  const [cwd, setCwd] = React.useState<string>("/home/oasis");
  const [entries, setEntries] = React.useState<DirEntry[]>([]);
  const [selected, setSelected] = React.useState<DirEntry | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState<boolean>(false);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");
  const [previewLoading, setPreviewLoading] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { stdout, error: err } = await terminalCall({ command: "ls -1Ap", cwd });
      if (err) setError(err);
      setEntries(parseLsOnePerLine(stdout));
    } catch {
      setError("Failed to list directory");
    } finally {
      setLoading(false);
    }
  }, [cwd]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function cwdSegments(): string[] {
    if (cwd === "/") return ["/"];
    const parts = cwd.replace(/^\/+/, "").split("/");
    return ["/", ...parts.filter(Boolean)];
  }

  const navigateTo = React.useCallback(async (nextCwd: string) => {
    setPreview(null);
    setSelected(null);
    setCwd(nextCwd);
  }, []);

  const openDir = React.useCallback(
    async (name: string) => {
      const next = joinPath(cwd, name);
      await navigateTo(next);
    },
    [cwd, navigateTo]
  );

  const goUp = React.useCallback(async () => {
    if (cwd === "/") return;
    const parts = cwd.split("/").filter(Boolean);
    const parent = parts.length <= 1 ? "/" : "/" + parts.slice(0, -1).join("/");
    await navigateTo(parent);
  }, [cwd, navigateTo]);

  const openFilePreview = React.useCallback(
    async (name: string) => {
      setPreviewOpen(true);
      setPreviewTitle(name);
      setPreviewLoading(true);
      setError(null);
      setPreview(null);
      try {
        const quoted = shellQuote(name);
        const { stdout, error: err } = await terminalCall({
          command: `head -n 400 ${quoted}`,
          cwd,
        });
        if (err) setError(err);
        const text = (stdout ?? []).join("\n");
        setPreview(text.length > 0 ? text : "(empty file or binary)\n");
      } catch {
        setError("Failed to open file");
      } finally {
        setPreviewLoading(false);
      }
    },
    [cwd]
  );

  const onItemActivate = React.useCallback(
    async (entry: DirEntry) => {
      setSelected(entry);
      if (entry.kind === "directory") await openDir(entry.name);
      else await openFilePreview(entry.name);
    },
    [openDir, openFilePreview]
  );

  return (
    <div className={cn("h-full w-full flex flex-col", className)} {...props}>
      <div className="flex items-center gap-0 overflow-x-auto p-2 bg-gradient-to-b from-white/40 to-transparent">
        {cwdSegments().map((seg, idx, arr) => {
          const isRoot = idx === 0;
          const path = isRoot ? "/" : "/" + arr.slice(1, idx + 1).join("/");
          return (
            <React.Fragment key={`${seg}-${idx}`}>
              {idx > 0 && <span className="text-muted-foreground">/</span>}
              <button
                className={cn(
                  "text-md px-1.5 py-0.5 rounded-md hover:bg-foreground/10 transition-all",
                  idx === arr.length - 1 ? "font-semibold" : "text-muted-foreground"
                )}
                onClick={() => navigateTo(path)}
              >
                {isRoot ? "~" : seg}
              </button>
            </React.Fragment>
          );
        })}

        <div className="ml-auto text-xs text-muted-foreground">
          {loading ? "Loading..." : error ? <span className="text-red-500">{error}</span> : null}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <div className="min-h-0 border-r">
          <ScrollArea className="h-full">
            <div className="p-4">
              {entries.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Empty</div>
              ) : (
                <div
                  className={cn(
                    "grid",
                    "gap-x-4 gap-y-6",
                    "[grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]"
                  )}
                  role="list"
                >
                  {entries.map((e) => {
                    const info = classifyEntry(e);
                    const Icon = info.icon;
                    const isSelected = selected?.name === e.name;
                    return (
                      <button
                        key={e.name}
                        className={cn(
                          "group flex flex-col items-center rounded-lg p-3 text-center",
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring group"
                        )}
                        onClick={() => setSelected(e)}
                        onDoubleClick={() => onItemActivate(e)}
                        title={e.name}
                      >
                        <div
                          className={cn(
                            "w-20 h-20 grid place-items-center rounded-lg",
                            info.fg,
                            isSelected ? "bg-primary/10" : "bg-transparent"
                          )}
                        >
                          <Icon className="transition-all size-14" />
                        </div>
                        <div
                          className={cn(
                            "mt-2 px-2 py-1 rounded-md w-fit mx-auto text-xs leading-4 text-foreground/90 truncate transition-all",
                            isSelected ? " font-semibold bg-primary text-primary-foreground " : ""
                          )}
                        >
                          {e.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl bg-white/60 backdrop-blur-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="truncate text-2xl font-semibold tracking-tight"
              title={previewTitle}
            >
              {previewTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {previewLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading preview…</div>
            ) : (
              <pre className="max-h-[60vh] overflow-auto text-base whitespace-pre-wrap font-mono">
                {preview ?? "(no preview)"}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FilesApp;
