import fs from "fs";
import path from "path";
import os from "os";
import { BAD_REQUEST } from "./errors.js";

export type SafeRoots = string[];

export function getAllowedRoots(): SafeRoots {
  const env = process.env.FS_ROOTS;
  if (env && env.trim().length > 0) {
    const parts = env
      .split(process.platform === "win32" ? ";" : ":")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => (p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p))
      .map((p) => path.resolve(p));
    return parts.length > 0 ? parts : [defaultRoot()];
  }
  return [defaultRoot()];
}

function defaultRoot(): string {
  // When running from backend/, default to the monorepo root one level up
  try {
    return path.resolve(process.cwd(), "..");
  } catch {
    return process.cwd();
  }
}

export function normalizeInput(inputPath: string, cwd?: string): string {
  if (!inputPath || typeof inputPath !== "string") return "";
  let p = inputPath.trim();
  if (p.startsWith("~")) p = path.join(os.homedir(), p.slice(1));
  if (!path.isAbsolute(p)) {
    const base = cwd ? normalizeInput(cwd) : process.cwd();
    p = path.join(base, p);
  }
  return path.resolve(p);
}

export function resolveSafePath(inputPath: string, cwd?: string): { abs: string; root: string } {
  const abs = normalizeInput(inputPath, cwd);
  // Resolve symlinks to prevent escapes
  const real = fs.existsSync(abs) ? fs.realpathSync(abs) : abs;
  const roots = getAllowedRoots();
  // Resolve roots to real paths as well, to handle platform mount prefixes (e.g., macOS Data volume)
  const realRoots = roots.map((r) => (fs.existsSync(r) ? fs.realpathSync(r) : r));
  const rootIndex = realRoots.findIndex((r) => isSubPathOf(real, r));
  const root = rootIndex >= 0 ? roots[rootIndex] : undefined;
  if (!root) {
    throw BAD_REQUEST(`Path is outside allowed roots: ${abs}`);
  }
  return { abs: real, root };
}

function isSubPathOf(candidate: string, root: string): boolean {
  const rel = path.relative(root, candidate);
  // Treat the root itself (rel === '') as inside the root as well
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function pathType(abs: string): "file" | "dir" | "symlink" | null {
  try {
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink()) return "symlink";
    if (st.isDirectory()) return "dir";
    if (st.isFile()) return "file";
    return null;
  } catch {
    return null;
  }
}

export function isHiddenName(name: string): boolean {
  return name.startsWith(".");
}

export function guessIsText(filename: string): boolean {
  const textExts = new Set([
    ".txt",
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".csv",
    ".log",
    ".gitignore",
    ".env",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".html",
    ".htm",
    ".py",
    ".rb",
    ".rs",
    ".go",
    ".java",
    ".kt",
    ".swift",
    ".c",
    ".cc",
    ".cpp",
    ".h",
    ".hpp",
    ".sql",
    ".sh",
    ".bash",
    ".zsh",
  ]);
  const ext = path.extname(filename).toLowerCase();
  return textExts.has(ext) || ext === "";
}

export function listDirSafe(abs: string, opts: { includeHidden?: boolean } = {}) {
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const items = entries
    .filter((d) => opts.includeHidden || !isHiddenName(d.name))
    .map((d) => {
      const p = path.join(abs, d.name);
      const type: "file" | "dir" | "symlink" = d.isDirectory()
        ? "dir"
        : d.isSymbolicLink()
        ? "symlink"
        : "file";
      let size = 0;
      let mtimeMs = 0;
      try {
        const st = fs.statSync(p);
        size = st.size;
        mtimeMs = st.mtimeMs;
      } catch {}
      return { name: d.name, path: p, type, size, mtimeMs };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export function walkFilesSafe(
  absDir: string,
  opts: { includeHidden?: boolean; maxFiles?: number; ignore?: (p: string) => boolean } = {}
) {
  const results: string[] = [];
  const stack: string[] = [absDir];
  const max = opts.maxFiles ?? 10000;
  while (stack.length > 0 && results.length < max) {
    const dir = stack.pop()!;
    let items: fs.Dirent[] = [];
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of items) {
      if (!opts.includeHidden && isHiddenName(d.name)) continue;
      const p = path.join(dir, d.name);
      if (opts.ignore && opts.ignore(p)) continue;
      if (d.isDirectory()) stack.push(p);
      else if (d.isFile()) results.push(p);
      if (results.length >= max) break;
    }
  }
  return results;
}
