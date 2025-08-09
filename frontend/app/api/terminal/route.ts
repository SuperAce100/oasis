// Terminal command processing API
// Accepts JSON: { input: string, cwdParts?: string[], fs?: DirNodeJSON }
// Returns JSON: { stdout: string[], cwdParts: string[], fs: DirNodeJSON }

export const dynamic = "force-dynamic";

type FileNodeJSON = { type: "file"; content: string };
type DirNodeJSON = { type: "dir"; children: Record<string, NodeJSON> };
type NodeJSON = FileNodeJSON | DirNodeJSON;

function isDir(node: NodeJSON | undefined): node is DirNodeJSON {
  return Boolean(node) && (node as NodeJSON).type === "dir";
}
function isFile(node: NodeJSON | undefined): node is FileNodeJSON {
  return Boolean(node) && (node as NodeJSON).type === "file";
}

function createInitialFileSystem(): DirNodeJSON {
  return {
    type: "dir",
    children: {
      home: {
        type: "dir",
        children: {
          oasis: {
            type: "dir",
            children: {
              documents: {
                type: "dir",
                children: {
                  "readme.txt": {
                    type: "file",
                    content: "Welcome to Oasis OS! This is a demo file.\n",
                  },
                },
              },
              "notes.txt": { type: "file", content: "Some quick notes\n" },
            },
          },
        },
      },
      tmp: { type: "dir", children: {} },
    },
  };
}

function normalizeAndSplitPath(input: string): { parts: string[]; isAbsolute: boolean } {
  const isAbsolute = input.startsWith("/");
  const rawParts = input.split("/").filter((p) => p.length > 0);
  const parts: string[] = [];
  for (const p of rawParts) {
    if (p === ".") continue;
    if (p === "..") {
      if (parts.length > 0) parts.pop();
      continue;
    }
    parts.push(p);
  }
  return { parts, isAbsolute };
}

function resolvePath(cwd: string[], pathLike: string): string[] {
  const { parts, isAbsolute } = normalizeAndSplitPath(pathLike);
  const base = isAbsolute ? [] : [...cwd];
  for (const part of parts) {
    if (part === "..") base.pop();
    else if (part !== ".") base.push(part);
  }
  return base;
}

function getNode(root: DirNodeJSON, pathParts: string[]): NodeJSON | undefined {
  let current: NodeJSON = root;
  for (const segment of pathParts) {
    if (!isDir(current)) return undefined;
    const child = current.children[segment];
    if (!child) return undefined;
    current = child;
  }
  return current;
}

function getParentAndName(
  root: DirNodeJSON,
  pathParts: string[]
): { parent?: DirNodeJSON; name: string } {
  if (pathParts.length === 0) return { parent: undefined, name: "" };
  const name = pathParts[pathParts.length - 1];
  const parentPath = pathParts.slice(0, -1);
  const parentNode =
    parentPath.length === 0 ? root : (getNode(root, parentPath) as NodeJSON | undefined);
  return { parent: isDir(parentNode) ? parentNode : undefined, name };
}

function formatPath(parts: string[]): string {
  const pathStr = "/" + parts.join("/");
  if (parts.length >= 2 && parts[0] === "home" && parts[1] === "oasis") {
    const remainder = parts.slice(2);
    return "~" + (remainder.length ? "/" + remainder.join("/") : "");
  }
  return pathStr;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch as '"' | "'";
      continue;
    }
    if (ch === " ") {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function command_help(): string[] {
  return [
    "Available commands:",
    "  help                 Show this help",
    "  pwd                  Print working directory",
    "  ls [path]            List directory contents",
    "  cd <path>            Change directory",
    "  cat <file>           Print file contents",
    "  mkdir <dir>          Create directory",
    "  touch <file>         Create empty file",
    "  rm [-r] <path>       Remove file or directory",
    "  echo <text>          Print text. Use 'echo text > file' to write",
    "  date                 Show current date",
    "  whoami               Show current user",
  ];
}

function command_pwd(cwdParts: string[]): string[] {
  return [formatPath(cwdParts)];
}

function command_ls(fs: DirNodeJSON, cwdParts: string[], args: string[]): string[] {
  const targetPath = args[0] ? resolvePath(cwdParts, args[0]) : [...cwdParts];
  const node = getNode(fs, targetPath);
  if (!node) return ["ls: No such file or directory"];
  if (isFile(node)) return [args[0] ?? formatPath(targetPath)];
  const names = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
  const formatted = names.map((name) => (isDir(node.children[name]) ? name + "/" : name));
  return [formatted.join("  ")];
}

function command_cd(
  fs: DirNodeJSON,
  cwdParts: string[],
  args: string[]
): { stdout: string[]; cwdParts: string[] } {
  const next = args[0] ? resolvePath(cwdParts, args[0]) : ["home", "oasis"];
  const node = getNode(fs, next);
  if (!node) return { stdout: ["cd: No such file or directory"], cwdParts };
  if (!isDir(node)) return { stdout: ["cd: Not a directory"], cwdParts };
  return { stdout: [], cwdParts: next };
}

function command_cat(fs: DirNodeJSON, cwdParts: string[], args: string[]): string[] {
  if (args.length === 0) return ["cat: missing file operand"];
  const pathParts = resolvePath(cwdParts, args[0]);
  const node = getNode(fs, pathParts);
  if (!node) return ["cat: No such file"];
  if (!isFile(node)) return ["cat: Is a directory"];
  return [node.content];
}

function getParentAndNameJSON(
  root: DirNodeJSON,
  pathParts: string[]
): { parent?: DirNodeJSON; name: string } {
  return getParentAndName(root, pathParts);
}

function command_mkdir(fs: DirNodeJSON, cwdParts: string[], args: string[]): string[] {
  if (args.length === 0) return ["mkdir: missing operand"];
  const target = resolvePath(cwdParts, args[0]);
  const { parent, name } = getParentAndNameJSON(fs, target);
  if (!parent) return ["mkdir: cannot create directory"];
  if (parent.children[name]) return ["mkdir: File exists"];
  parent.children[name] = { type: "dir", children: {} };
  return [];
}

function command_touch(fs: DirNodeJSON, cwdParts: string[], args: string[]): string[] {
  if (args.length === 0) return ["touch: missing file operand"];
  const target = resolvePath(cwdParts, args[0]);
  const { parent, name } = getParentAndNameJSON(fs, target);
  if (!parent) return ["touch: cannot touch file"];
  const existing = parent.children[name];
  if (existing && !isFile(existing)) return ["touch: is a directory"];
  parent.children[name] = { type: "file", content: isFile(existing) ? existing.content : "" };
  return [];
}

function command_rm(fs: DirNodeJSON, cwdParts: string[], args: string[]): string[] {
  if (args.length === 0) return ["rm: missing operand"];
  const recursive = args[0] === "-r" || args[0] === "-rf" || args[0] === "-fr";
  const pathArg = recursive ? args[1] : args[0];
  if (!pathArg) return ["rm: missing operand"];
  const target = resolvePath(cwdParts, pathArg);
  const { parent, name } = getParentAndNameJSON(fs, target);
  if (!parent) return ["rm: cannot remove"];
  const node = parent.children[name];
  if (!node) return ["rm: No such file or directory"];
  if (isDir(node) && !recursive && Object.keys(node.children).length > 0)
    return ["rm: is a directory (use -r)"];
  delete parent.children[name];
  return [];
}

function command_echo(fs: DirNodeJSON, cwdParts: string[], args: string[]): string[] {
  if (args.length === 0) return [""];
  const redirectIndex = args.indexOf(">");
  if (redirectIndex > -1) {
    const text = args.slice(0, redirectIndex).join(" ");
    const targetPath = args[redirectIndex + 1];
    if (!targetPath) return ["echo: missing file after >"];
    const target = resolvePath(cwdParts, targetPath);
    const { parent, name } = getParentAndNameJSON(fs, target);
    if (!parent) return ["echo: cannot write file"];
    parent.children[name] = { type: "file", content: text + "\n" };
    return [];
  }
  return [args.join(" ")];
}

function command_date(): string[] {
  return [new Date().toString()];
}

function command_whoami(): string[] {
  return ["oasis"];
}

export async function POST(req: Request) {
  try {
    const {
      input,
      cwdParts: cwdFromClient,
      fs: fsFromClient,
    } = (await req.json()) as {
      input: string;
      cwdParts?: string[];
      fs?: DirNodeJSON;
    };

    if (typeof input !== "string") {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    let fs: DirNodeJSON = fsFromClient ?? createInitialFileSystem();
    let cwdParts: string[] = cwdFromClient ?? ["home", "oasis"];

    const args = tokenize(input.trim());
    const [cmd, ...rest] = args;
    let stdout: string[] = [];

    switch (cmd) {
      case "help":
        stdout = command_help();
        break;
      case "pwd":
        stdout = command_pwd(cwdParts);
        break;
      case "ls":
        stdout = command_ls(fs, cwdParts, rest);
        break;
      case "cd": {
        const res = command_cd(fs, cwdParts, rest);
        stdout = res.stdout;
        cwdParts = res.cwdParts;
        break;
      }
      case "cat":
        stdout = command_cat(fs, cwdParts, rest);
        break;
      case "mkdir":
        stdout = command_mkdir(fs, cwdParts, rest);
        break;
      case "touch":
        stdout = command_touch(fs, cwdParts, rest);
        break;
      case "rm":
        stdout = command_rm(fs, cwdParts, rest);
        break;
      case "echo":
        stdout = command_echo(fs, cwdParts, rest);
        break;
      case "date":
        stdout = command_date();
        break;
      case "whoami":
        stdout = command_whoami();
        break;
      default:
        stdout = [`${cmd}: command not found`];
    }

    return Response.json({ stdout, cwdParts, fs });
  } catch (err) {
    return Response.json({ error: "Bad Request" }, { status: 400 });
  }
}
