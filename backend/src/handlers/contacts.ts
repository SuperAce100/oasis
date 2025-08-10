import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { BAD_REQUEST } from '../utils/errors.js';
import { emitProgress, type LogContext } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

type ListArgs = { limit?: number; pageToken?: string };
const LIST_SCHEMA: JSONSchemaType<ListArgs> = {
  type: 'object',
  properties: {
    limit: { type: 'number', nullable: true, minimum: 1, maximum: 500, default: 50 },
    pageToken: { type: 'string', nullable: true },
  },
};

type SearchArgs = { query: string; limit?: number };
const SEARCH_SCHEMA: JSONSchemaType<SearchArgs> = {
  type: 'object',
  required: ['query'],
  properties: {
    query: { type: 'string' },
    limit: { type: 'number', nullable: true, minimum: 1, maximum: 100, default: 25 },
  },
};

function ensureGoogleCredentials(): void {
  const creds = fs.existsSync(path.join(process.cwd(), 'credentials.json'));
  const token = fs.existsSync(path.join(process.cwd(), 'token.json'));
  if (!creds) throw BAD_REQUEST('credentials.json not found in backend/');
  if (!token) throw BAD_REQUEST('token.json not found in backend/ (re-auth required)');
}

function getOAuthClient(): OAuth2Client {
  const credsPath = path.join(process.cwd(), 'credentials.json');
  const { installed, web } = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  const cfg = installed || web;
  if (!cfg) throw BAD_REQUEST('Invalid credentials.json format');
  const oAuth2Client = new OAuth2Client(cfg.client_id, cfg.client_secret, (cfg.redirect_uris || [])[0]);
  const tokenPath = path.join(process.cwd(), 'token.json');
  if (!fs.existsSync(tokenPath)) throw BAD_REQUEST('token.json not found. Please authenticate first.');
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function getPeopleClient() {
  const auth = getOAuthClient();
  return google.people({ version: 'v1', auth });
}

function mapPerson(p: any) {
  const names = (p.names ?? []).map((n: any) => n.displayName).filter(Boolean);
  const emails = (p.emailAddresses ?? []).map((e: any) => e.value).filter(Boolean);
  const phones = (p.phoneNumbers ?? []).map((ph: any) => ph.value).filter(Boolean);
  const org = (p.organizations ?? [])[0];
  const note = (p.biographies ?? [])[0]?.value ?? undefined;
  const photoUrl = (p.photos ?? [])[0]?.url ?? undefined;
  return {
    id: p.resourceName,
    names,
    emails,
    phones,
    org: org ? { name: org.name, title: org.title } : undefined,
    note,
    photoUrl,
  };
}

export async function handleContactsList(args: unknown, _context: LogContext) {
  emitProgress(1, 3, 'validating input');
  ensureGoogleCredentials();
  const a = validateOrThrow(LIST_SCHEMA, args, 'list_contacts');

  emitProgress(2, 3, 'listing contacts');
  const people = await getPeopleClient();
  const res = await people.people.connections.list({
    resourceName: 'people/me',
    pageSize: a.limit ?? 50,
    pageToken: a.pageToken,
    personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,photos',
  });

  const items = (res.data.connections ?? []).map(mapPerson);
  emitProgress(3, 3, 'done');
  return { content: [{ type: 'json', data: { contacts: items, nextPageToken: res.data.nextPageToken } }] };
}

export async function handleContactsSearch(args: unknown, _context: LogContext) {
  emitProgress(1, 3, 'validating input');
  ensureGoogleCredentials();
  const a = validateOrThrow(SEARCH_SCHEMA, args, 'search_contacts');

  emitProgress(2, 3, 'searching contacts');
  const people = await getPeopleClient();
  const res = await people.people.searchContacts({
    query: a.query,
    pageSize: a.limit ?? 25,
    readMask: 'names,emailAddresses,phoneNumbers,organizations,biographies,photos',
  });
  const items = (res.data.results ?? []).map((r: any) => mapPerson(r.person));
  emitProgress(3, 3, 'done');
  return { content: [{ type: 'json', data: { contacts: items } }] };
}

