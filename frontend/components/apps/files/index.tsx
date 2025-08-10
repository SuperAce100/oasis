"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBackend } from "@/hooks/use-backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Folder as FolderIcon,
  File as FileIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  FileCode as FileCodeIcon,
  FileType2 as FilePdfIcon,
} from "lucide-react";

export type FilesAppProps = React.HTMLAttributes<HTMLDivElement>;
type FilesDeeplink = { path?: string } | undefined;

type DirEntry = { name: string; kind: "file" | "directory" };

function shellQuote(token: string): string {
  return `'${token.replace(/'/g, "'\\''")}'`;
}

// Direct MCP calls instead of shelling out via terminal

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

function isLikelyBinaryText(sample: string): boolean {
  // Heuristic: many replacement characters or control chars suggest binary
  const len = sample.length;
  if (len === 0) return false;
  let suspicious = 0;
  for (let i = 0; i < Math.min(len, 2048); i++) {
    const c = sample.charCodeAt(i);
    // control chars excluding tab/newline/carriage return
    if (c < 9 || (c > 13 && c < 32)) suspicious++;
  }
  const ratio = suspicious / Math.min(len, 2048);
  return ratio > 0.05 || sample.includes("\uFFFD");
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

function normalizeCwd(input: string): string {
  let p = input.trim().replace(/\\/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  // remove trailing slash except for root
  p = p.replace(/\/+$/, "");
  return p.length === 0 ? "/" : p;
}

export function FilesApp({ className, ...props }: FilesAppProps) {
  const { callTool } = useBackend();
  const [fsRoot, setFsRoot] = React.useState<string>("");
  const [cwd, setCwd] = React.useState<string>("");
  const [entries, setEntries] = React.useState<DirEntry[]>([]);
  const [selected, setSelected] = React.useState<DirEntry | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState<boolean>(false);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");
  const [previewLoading, setPreviewLoading] = React.useState<boolean>(false);
  const [previewKind, setPreviewKind] = React.useState<
    "text" | "code" | "image" | "pdf" | "unknown"
  >("unknown");
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deeplinkOpenFile, setDeeplinkOpenFile] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callTool<{ items: { name: string; type: "file" | "dir" }[] }>("fs_dir", {
        path: ".",
        cwd,
      });
      const items = (result as any)?.items as { name: string; type: "file" | "dir" }[];
      const mapped: DirEntry[] = (items ?? [])
        .map((it) => ({
          name: it.name,
          kind: it.type === "dir" ? ("directory" as const) : ("file" as const),
        }))
        .sort((a, b) =>
          a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "directory" ? -1 : 1
        );
      setEntries(mapped);
    } catch (e) {
      console.error("[FilesApp] Failed to list directory:", e);
      setError("Failed to list directory");
    } finally {
      setLoading(false);
    }
  }, [cwd, callTool]);

  const openFilePreviewRef = React.useRef<null | ((name: string) => Promise<void>)>(null);
  const openFilePreview = React.useCallback(
    async (name: string) => {
      // Assign function to ref to avoid ordering/lint issues with effects
      if (!openFilePreviewRef.current) {
        openFilePreviewRef.current = async (n: string) => {
          setPreviewOpen(true);
          setPreviewTitle(n);
          setPreviewLoading(true);
          setError(null);
          setPreview(null);
          setPreviewSrc(null);
          try {
            const ext = getExtension(n);
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
              "md",
              "txt",
              "log",
              "csv",
            ]);

            if (ext === "pdf") {
              const res = await callTool<{ content?: string }>("fs_read", {
                path: n,
                cwd,
                encoding: "base64",
              });
              const b64 = (res as any)?.content ?? "";
              setPreviewKind("pdf");
              setPreviewSrc(`data:application/pdf;base64,${b64}`);
            } else if (imageExt.has(ext)) {
              const res = await callTool<{ content?: string }>("fs_read", {
                path: n,
                cwd,
                encoding: "base64",
              });
              const b64 = (res as any)?.content ?? "";
              const mime =
                ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
              setPreviewKind("image");
              setPreviewSrc(`data:${mime};base64,${b64}`);
            } else if (codeExt.has(ext)) {
              const res = await callTool<{ content?: string }>("fs_read", {
                path: n,
                cwd,
                encoding: "utf8",
                maxBytes: 1024 * 1024,
              });
              const text = (res as any)?.content ?? "";
              setPreviewKind(ext === "md" || ext === "txt" || ext === "log" ? "text" : "code");
              setPreview(text.length > 0 ? text : "(empty file)\n");
            } else {
              // Fallback: attempt utf8 text, then upgrade if looks binary (common for images)
              const res = await callTool<{ content?: string }>("fs_read", {
                path: n,
                cwd,
                encoding: "utf8",
                maxBytes: 256 * 1024,
              });
              const text = (res as any)?.content ?? "";
              if (
                isLikelyBinaryText(text) ||
                /^(?:.PNG|%PDF|GIF8|.JFIF|.Exif)/.test(text.slice(0, 16))
              ) {
                // Try rendering as image or pdf
                if (ext === "pdf") {
                  const b = await callTool<{ content?: string }>("fs_read", {
                    path: n,
                    cwd,
                    encoding: "base64",
                  });
                  setPreviewKind("pdf");
                  setPreviewSrc(`data:application/pdf;base64,${(b as any)?.content ?? ""}`);
                } else {
                  const b = await callTool<{ content?: string }>("fs_read", {
                    path: n,
                    cwd,
                    encoding: "base64",
                  });
                  const mime =
                    ext === "svg"
                      ? "image/svg+xml"
                      : `image/${ext === "jpg" ? "jpeg" : ext || "png"}`;
                  setPreviewKind("image");
                  setPreviewSrc(`data:${mime};base64,${(b as any)?.content ?? ""}`);
                }
              } else {
                setPreviewKind("text");
                setPreview(text.length > 0 ? text : "(empty file)\n");
              }
            }
          } catch {
            setError("Failed to open file");
            setPreviewKind("unknown");
          } finally {
            setPreviewLoading(false);
          }
        };
      }
      await openFilePreviewRef.current(name);
    },
    [cwd, callTool]
  );

  React.useEffect(() => {
    // Initialize CWD from allowed roots or refresh when set
    if (!cwd || !fsRoot) {
      (async () => {
        try {
          const rootsRes = await callTool<{ roots?: string[] }>("fs_roots", {});
          const firstRoot = Array.isArray((rootsRes as any)?.roots)
            ? ((rootsRes as any).roots as string[])[0]
            : undefined;
          if (firstRoot) {
            const r = normalizeCwd(firstRoot);
            setFsRoot(r);
            setCwd(r);
          }
        } catch {
          // ignore
        }
      })();
    } else {
      void refresh();
    }
  }, [cwd, fsRoot, callTool]);

  // Deeplink support via data-deeplink attribute (reacts to changes)
  React.useEffect(() => {
    const raw = (props as any)["data-deeplink"] as string | undefined;
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as FilesDeeplink;
      if (d?.path && typeof d.path === "string") {
        const candidate = normalizeCwd(d.path);
        // Try treating candidate as a directory; if it fails, open parent and preview file
        (async () => {
          try {
            // Ensure root matches allowed root containing candidate
            const rootsRes = await callTool<{ roots?: string[] }>("fs_roots", {});
            const roots = (
              Array.isArray((rootsRes as any)?.roots) ? ((rootsRes as any).roots as string[]) : []
            ).map(normalizeCwd);
            const containingRoot = roots.find((r) => candidate.startsWith(r));
            if (containingRoot) {
              setFsRoot(containingRoot);
              await callTool("fs_dir", { path: ".", cwd: candidate });
              setCwd(candidate);
            }
          } catch {
            const parent = candidate.replace(/\/(?:[^/]+)$/, "");
            const file = candidate.split("/").pop() || "";
            if (fsRoot && parent.startsWith(fsRoot)) {
              setCwd(parent.length === 0 ? fsRoot : parent);
            }
            setDeeplinkOpenFile(file);
          }
        })();
      }
    } catch {
      // ignore
    }
  }, [(props as any)["data-deeplink"], callTool, fsRoot]);

  // After listing completes, open file preview if requested by deeplink
  React.useEffect(() => {
    if (!deeplinkOpenFile || loading || !cwd) return;
    (async () => {
      try {
        await openFilePreview(deeplinkOpenFile);
      } finally {
        setDeeplinkOpenFile(null);
      }
    })();
  }, [deeplinkOpenFile, loading, cwd, openFilePreview]);

  function cwdSegments(): string[] {
    if (!fsRoot) return ["~"];
    if (cwd === fsRoot) return ["~"];
    const rel = cwd.startsWith(fsRoot) ? cwd.slice(fsRoot.length) : cwd;
    const parts = rel.replace(/^\/+/, "").split("/");
    return ["~", ...parts.filter(Boolean)];
  }

  const navigateTo = React.useCallback(
    async (nextCwd: string) => {
      setPreview(null);
      setSelected(null);
      const target = fsRoot && !nextCwd.startsWith(fsRoot) ? fsRoot : nextCwd;
      setCwd(target);
    },
    [fsRoot]
  );

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
    const parent = parts.length <= 1 ? fsRoot : cwd.slice(0, cwd.lastIndexOf("/"));
    await navigateTo(parent || fsRoot);
  }, [cwd, navigateTo, fsRoot]);

  // openFilePreview defined earlier

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
      <div className="flex items-center gap-0 overflow-x-auto p-2 bg-gradient-to-b from-white/40 to-background">
        {cwdSegments().map((seg, idx, arr) => {
          const isRoot = idx === 0;
          const path = isRoot
            ? fsRoot || "/"
            : (fsRoot || "") + "/" + arr.slice(1, idx + 1).join("/");
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
                    "gap-x-4 gap-y-6 overflow-y-auto",
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
        <DialogContent className="sm:max-w-2xl bg-gradient-to-b from-white/40 to-background backdrop-blur-sm rounded-2xl">
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
            ) : previewKind === "image" && previewSrc ? (
              <div className="max-h-[70vh] overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewSrc} alt={previewTitle} className="max-w-full h-auto" />
              </div>
            ) : previewKind === "pdf" && previewSrc ? (
              <div className="h-[70vh]">
                <iframe src={previewSrc} className="w-full h-full rounded-md" />
              </div>
            ) : previewKind === "code" && typeof preview === "string" ? (
              <CodeBlock
                code={preview}
                language={getExtension(previewTitle) || "txt"}
                variant="flat"
              />
            ) : previewKind === "text" && typeof preview === "string" ? (
              <pre className="max-h-[60vh] overflow-auto text-base whitespace-pre-wrap font-mono">
                {preview}
              </pre>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">(no preview)</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FilesApp;
