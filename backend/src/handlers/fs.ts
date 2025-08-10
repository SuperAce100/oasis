import { JSONSchemaType } from 'ajv';
import fs from 'fs';
import path from 'path';
import { validateOrThrow } from '../utils/ajv.js';
import { BAD_REQUEST, INTERNAL_ERROR } from '../utils/errors.js';
import { emitProgress, type LogContext } from '../utils/logger.js';
import { getAllowedRoots, resolveSafePath, listDirSafe, pathType, guessIsText, normalizeInput } from '../utils/fs-safe.js';

// Schemas
type ExistsArgs = { path: string; cwd?: string };
const EXISTS_SCHEMA: JSONSchemaType<ExistsArgs> = {
  type: 'object',
  required: ['path'],
  properties: { path: { type: 'string' }, cwd: { type: 'string', nullable: true } },
};

type StatArgs = { path: string; cwd?: string };
const STAT_SCHEMA: JSONSchemaType<StatArgs> = EXISTS_SCHEMA as any;

type DirArgs = { path: string; cwd?: string; includeHidden?: boolean; limit?: number; cursor?: string };
const DIR_SCHEMA: JSONSchemaType<DirArgs> = {
  type: 'object',
  required: ['path'],
  properties: {
    path: { type: 'string' },
    cwd: { type: 'string', nullable: true },
    includeHidden: { type: 'boolean', nullable: true, default: false },
    limit: { type: 'number', nullable: true, default: 2000 },
    cursor: { type: 'string', nullable: true },
  },
};

type ResolveArgs = { cwd?: string; path: string };
const RESOLVE_SCHEMA: JSONSchemaType<ResolveArgs> = {
  type: 'object',
  required: ['path'],
  properties: { cwd: { type: 'string', nullable: true }, path: { type: 'string' } },
};

type ReadArgs = { path: string; cwd?: string; encoding?: 'utf8' | 'base64'; maxBytes?: number };
const READ_SCHEMA: JSONSchemaType<ReadArgs> = {
  type: 'object',
  required: ['path'],
  properties: {
    path: { type: 'string' },
    cwd: { type: 'string', nullable: true },
    encoding: { type: 'string', enum: ['utf8', 'base64'], nullable: true, default: 'utf8' },
    maxBytes: { type: 'number', nullable: true },
  },
};

type WriteArgs = { path: string; cwd?: string; content: string; encoding?: 'utf8' | 'base64'; create?: boolean; overwrite?: boolean; mkdirp?: boolean };
const WRITE_SCHEMA: JSONSchemaType<WriteArgs> = {
  type: 'object',
  required: ['path', 'content'],
  properties: {
    path: { type: 'string' },
    cwd: { type: 'string', nullable: true },
    content: { type: 'string' },
    encoding: { type: 'string', enum: ['utf8', 'base64'], nullable: true, default: 'utf8' },
    create: { type: 'boolean', nullable: true, default: true },
    overwrite: { type: 'boolean', nullable: true, default: true },
    mkdirp: { type: 'boolean', nullable: true, default: true },
  },
};

type MkdirArgs = { path: string; cwd?: string; recursive?: boolean };
const MKDIR_SCHEMA: JSONSchemaType<MkdirArgs> = {
  type: 'object',
  required: ['path'],
  properties: { path: { type: 'string' }, cwd: { type: 'string', nullable: true }, recursive: { type: 'boolean', nullable: true, default: true } },
};

type MoveArgs = { from: string; to: string; overwrite?: boolean; mkdirp?: boolean; cwd?: string };
const MOVE_SCHEMA: JSONSchemaType<MoveArgs> = {
  type: 'object',
  required: ['from', 'to'],
  properties: {
    from: { type: 'string' },
    to: { type: 'string' },
    overwrite: { type: 'boolean', nullable: true, default: false },
    mkdirp: { type: 'boolean', nullable: true, default: true },
    cwd: { type: 'string', nullable: true },
  },
};

type DeleteArgs = { path: string; cwd?: string; recursive?: boolean };
const DELETE_SCHEMA: JSONSchemaType<DeleteArgs> = {
  type: 'object',
  required: ['path'],
  properties: { path: { type: 'string' }, cwd: { type: 'string', nullable: true }, recursive: { type: 'boolean', nullable: true, default: false } },
};

export async function handleFsHealth(): Promise<any> {
  return { ok: true, roots: getAllowedRoots(), platform: process.platform, sep: path.sep };
}

export async function handleFsRoots(): Promise<any> {
  return { roots: getAllowedRoots() };
}

export async function handleFsExists(args: unknown): Promise<any> {
  const a = validateOrThrow(EXISTS_SCHEMA, args, 'fs.exists');
  const { abs } = resolveSafePath(a.path, a.cwd);
  const t = pathType(abs);
  return { exists: t !== null, type: t };
}

export async function handleFsStat(args: unknown): Promise<any> {
  const a = validateOrThrow(STAT_SCHEMA, args, 'fs.stat');
  const { abs } = resolveSafePath(a.path, a.cwd);
  const st = fs.statSync(abs);
  const type = pathType(abs);
  return { size: st.size, mtimeMs: st.mtimeMs, ctimeMs: st.ctimeMs, mode: st.mode, type };
}

export async function handleFsDir(args: unknown): Promise<any> {
  const a = validateOrThrow(DIR_SCHEMA, args, 'fs.dir');
  const { abs } = resolveSafePath(a.path, a.cwd);
  if (pathType(abs) !== 'dir') throw BAD_REQUEST('Path is not a directory');
  const items = listDirSafe(abs, { includeHidden: !!a.includeHidden });
  // Simple cursor: name-based pagination
  const start = a.cursor ? items.findIndex((i) => i.name > a.cursor!) : 0;
  const limit = Math.max(1, Math.min(a.limit ?? 2000, 10000));
  const slice = items.slice(start, start + limit);
  const next = start + limit < items.length ? slice[slice.length - 1].name : null;
  return { items: slice, nextCursor: next };
}

export async function handleFsResolve(args: unknown): Promise<any> {
  const a = validateOrThrow(RESOLVE_SCHEMA, args, 'fs.resolve');
  const { abs } = resolveSafePath(a.path, a.cwd);
  return { resolved: abs };
}

export async function handleFsRead(args: unknown): Promise<any> {
  const a = validateOrThrow(READ_SCHEMA, args, 'fs.read');
  const { abs } = resolveSafePath(a.path, a.cwd);
  const t = pathType(abs);
  if (t !== 'file') throw BAD_REQUEST('Path is not a file');
  const max = a.maxBytes ?? Number(process.env.FS_MAX_READ_BYTES ?? 10 * 1024 * 1024);
  const stat = fs.statSync(abs);
  const toRead = Math.min(stat.size, max);
  const buf = fs.readFileSync(abs);
  const truncated = buf.length > toRead;
  const use = truncated ? buf.subarray(0, toRead) : buf;
  if ((a.encoding ?? 'utf8') === 'base64') {
    return { content: use.toString('base64'), encoding: 'base64', truncated };
  }
  const content = use.toString('utf8');
  return { content, encoding: 'utf8', truncated };
}

export async function handleFsWrite(args: unknown): Promise<any> {
  const a = validateOrThrow(WRITE_SCHEMA, args, 'fs.write');
  const { abs } = resolveSafePath(a.path, a.cwd);
  const exists = fs.existsSync(abs);
  if (exists && a.overwrite === false) throw BAD_REQUEST('File exists and overwrite=false');
  if (!exists && a.create === false) throw BAD_REQUEST('File does not exist and create=false');
  if (a.mkdirp) fs.mkdirSync(path.dirname(abs), { recursive: true });
  const data = (a.encoding ?? 'utf8') === 'base64' ? Buffer.from(a.content, 'base64') : Buffer.from(a.content, 'utf8');
  fs.writeFileSync(abs, data);
  return { bytesWritten: data.length };
}

export async function handleFsMkdir(args: unknown): Promise<any> {
  const a = validateOrThrow(MKDIR_SCHEMA, args, 'fs.mkdir');
  const { abs } = resolveSafePath(a.path, a.cwd);
  fs.mkdirSync(abs, { recursive: a.recursive !== false });
  return { ok: true };
}

export async function handleFsMove(args: unknown): Promise<any> {
  const a = validateOrThrow(MOVE_SCHEMA, args, 'fs.move');
  const from = resolveSafePath(a.from, a.cwd).abs;
  const to = resolveSafePath(a.to, a.cwd).abs;
  if (fs.existsSync(to)) {
    if (!a.overwrite) throw BAD_REQUEST('Destination exists and overwrite=false');
    fs.rmSync(to, { recursive: true, force: true });
  }
  if (a.mkdirp) fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  return { ok: true };
}

export async function handleFsDelete(args: unknown): Promise<any> {
  const a = validateOrThrow(DELETE_SCHEMA, args, 'fs.delete');
  const { abs } = resolveSafePath(a.path, a.cwd);
  const t = pathType(abs);
  if (!t) return { ok: true };
  if (t === 'dir') fs.rmSync(abs, { recursive: !!a.recursive, force: true });
  else fs.rmSync(abs, { force: true });
  return { ok: true };
}

// Simple filename search (glob-lite by suffix/prefix) kept minimal for hackathon MVP
type FindArgs = { cwd: string; glob?: string; includeHidden?: boolean; limit?: number };
const FIND_SCHEMA: JSONSchemaType<FindArgs> = {
  type: 'object',
  required: ['cwd'],
  properties: {
    cwd: { type: 'string' },
    glob: { type: 'string', nullable: true },
    includeHidden: { type: 'boolean', nullable: true, default: false },
    limit: { type: 'number', nullable: true, default: 5000 },
  },
};

export async function handleFsFind(args: unknown): Promise<any> {
  const a = validateOrThrow(FIND_SCHEMA, args, 'fs.find');
  const base = resolveSafePath(a.cwd).abs;
  if (pathType(base) !== 'dir') throw BAD_REQUEST('cwd is not a directory');
  // Minimal: list all and filter by simple wildcard at end (e.g., **/*.ts)
  const pattern = (a.glob ?? '**/*').toLowerCase();
  const endsWith = pattern.startsWith('**/*.') ? pattern.slice(4) : '';
  const res: string[] = [];
  const stack: string[] = [base];
  const max = a.limit ?? 5000;
  while (stack.length && res.length < max) {
    const dir = stack.pop()!;
    let items: fs.Dirent[] = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const d of items) {
      if (!a.includeHidden && d.name.startsWith('.')) continue;
      const p = path.join(dir, d.name);
      if (d.isDirectory()) { stack.push(p); }
      else if (d.isFile()) {
        if (!endsWith || p.toLowerCase().endsWith(endsWith)) res.push(p);
      }
      if (res.length >= max) break;
    }
  }
  return { files: res };
}

// ----------------------------------------------
// Tab completion over path-like input (MVP)
// ----------------------------------------------
type CompleteArgs = { cwd?: string; input: string };
const COMPLETE_SCHEMA: JSONSchemaType<CompleteArgs> = {
  type: 'object',
  required: ['input'],
  properties: {
    cwd: { type: 'string', nullable: true },
    input: { type: 'string' },
  },
};

export async function handleFsComplete(args: unknown): Promise<any> {
  const a = validateOrThrow(COMPLETE_SCHEMA, args, 'fs.complete');
  const raw = a.input.trim();
  const slash = raw.lastIndexOf('/')
  const dirPart = slash >= 0 ? raw.slice(0, slash + 1) : '';
  const base = slash >= 0 ? raw.slice(slash + 1) : raw;

  // Resolve the directory we want to list; if input points to a dir, list it; else list its parent
  const dirToListInput = dirPart.length > 0 ? dirPart : '.';
  // Do not require existence; resolveSafePath will still enforce roots
  const { abs: absDir } = resolveSafePath(normalizeInput(dirToListInput, a.cwd), a.cwd);

  // If directory does not exist, try parent of that path
  const dirForListing = fs.existsSync(absDir) && pathType(absDir) === 'dir' ? absDir : path.dirname(absDir);
  const items = listDirSafe(dirForListing, { includeHidden: true });

  const suggestions = items
    .filter((it) => it.name.toLowerCase().startsWith(base.toLowerCase()))
    .map((it) => {
      const isDir = it.type === 'dir';
      const label = isDir ? `${it.name}/` : it.name;
      const fullPath = path.join(dirPart || '', it.name) + (isDir ? '/' : '');
      return {
        label,
        path: fullPath,
        type: it.type,
        appendSlash: isDir,
        replaceFrom: Math.max(0, slash + 1),
        replaceTo: raw.length,
      };
    });

  return { suggestions };
}

