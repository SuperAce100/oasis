import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { BAD_REQUEST, INTERNAL_ERROR } from '../utils/errors.js';
import type { LogContext } from '../utils/logger.js';
import { emitProgress } from '../utils/logger.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// ============================================================================
// INTERFACES
// ============================================================================

export interface GmailListArgs {
  limit?: number;
  labelIds?: string[];
  query?: string;
  unreadOnly?: boolean;
}

export interface GmailSearchArgs {
  query: string;
  limit?: number;
  labelIds?: string[];
}

export interface GmailReadArgs {
  messageId: string;
  format?: 'full' | 'minimal' | 'raw';
}

export interface GmailSendArgs {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  format?: 'html' | 'text';
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
      attachmentId?: string;
    };
    parts?: Array<{
      mimeType: string;
      headers: Array<{ name: string; value: string }>;
      body: {
        data?: string;
        attachmentId?: string;
      };
    }>;
  };
  sizeEstimate: number;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const GMAIL_LIST_SCHEMA: JSONSchemaType<GmailListArgs> = {
  type: 'object',
  properties: {
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20, nullable: true },
    labelIds: { 
      type: 'array', 
      items: { type: 'string' },
      default: [],
      nullable: true
    },
    query: { type: 'string', nullable: true },
    unreadOnly: { type: 'boolean', default: false, nullable: true }
  }
};

const GMAIL_SEARCH_SCHEMA: JSONSchemaType<GmailSearchArgs> = {
  type: 'object',
  required: ['query'],
  properties: {
    query: { type: 'string', minLength: 1 },
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20, nullable: true },
    labelIds: { 
      type: 'array', 
      items: { type: 'string' },
      default: [],
      nullable: true
    }
  }
};

const GMAIL_READ_SCHEMA: JSONSchemaType<GmailReadArgs> = {
  type: 'object',
  required: ['messageId'],
  properties: {
    messageId: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: ['full', 'minimal', 'raw'], default: 'full', nullable: true }
  }
};

const GMAIL_SEND_SCHEMA: JSONSchemaType<GmailSendArgs> = {
  type: 'object',
  required: ['to', 'subject', 'body'],
  properties: {
    to: { 
      type: 'array', 
      items: { type: 'string', minLength: 1 },
      minItems: 1
    },
    cc: { 
      type: 'array', 
      items: { type: 'string', minLength: 1 },
      nullable: true
    },
    bcc: { 
      type: 'array', 
      items: { type: 'string', minLength: 1 },
      nullable: true
    },
    subject: { type: 'string', minLength: 1 },
    body: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: ['html', 'text'], default: 'text', nullable: true }
  }
};

// ============================================================================
// GMAIL CLIENT SETUP
// ============================================================================

let gmailClient: any = null;

async function getGmailClient(): Promise<any> {
  if (gmailClient) return gmailClient;

  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  
  if (!fs.existsSync(credentialsPath)) {
    throw INTERNAL_ERROR('Gmail credentials.json not found. Please add your Google OAuth credentials.');
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  
  const oAuth2Client = new OAuth2Client(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have a stored token
  const tokenPath = path.join(process.cwd(), 'token.json');
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    oAuth2Client.setCredentials(token);
  } else {
    throw INTERNAL_ERROR('Gmail token.json not found. Please authenticate first.');
  }

  gmailClient = google.gmail({ version: 'v1', auth: oAuth2Client });
  return gmailClient;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data, 'base64').toString('utf-8');
  } catch {
    return data;
  }
}

function extractEmailContent(payload: any): { body: string; format: string } {
  if (payload.body?.data) {
    return {
      body: decodeBase64(payload.body.data),
      format: payload.mimeType === 'text/html' ? 'html' : 'text'
    };
  }

  if (payload.parts) {
    // Look for text/html first, then text/plain
    const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
    const textPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
    
    if (htmlPart?.body?.data) {
      return {
        body: decodeBase64(htmlPart.body.data),
        format: 'html'
      };
    }
    
    if (textPart?.body?.data) {
      return {
        body: decodeBase64(textPart.body.data),
        format: 'text'
      };
    }
  }

  return { body: '', format: 'text' };
}

function extractHeaders(payload: any): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (payload.headers) {
    payload.headers.forEach((header: any) => {
      headers[header.name.toLowerCase()] = header.value;
    });
  }

  if (payload.parts) {
    payload.parts.forEach((part: any) => {
      if (part.headers) {
        part.headers.forEach((header: any) => {
          headers[header.name.toLowerCase()] = header.value;
        });
      }
    });
  }

  return headers;
}

// ============================================================================
// HANDLERS
// ============================================================================

export async function handleGmailList(args: unknown, context: LogContext) {
  const validatedArgs = validateOrThrow(GMAIL_LIST_SCHEMA, args, 'gmail.list@v1') as GmailListArgs;
  
  emitProgress(0.3, 1.0, 'Fetching Gmail messages...');
  
  try {
    const gmail = await getGmailClient();
    
    const params: any = {
      maxResults: validatedArgs.limit || 20
    };

    if (validatedArgs.labelIds && validatedArgs.labelIds.length > 0) {
      params.labelIds = validatedArgs.labelIds;
    }

    if (validatedArgs.query) {
      params.q = validatedArgs.query;
    }

    if (validatedArgs.unreadOnly) {
      params.labelIds = [...(params.labelIds || []), 'UNREAD'];
    }

    emitProgress(0.6, 1.0, 'Executing Gmail API request...');
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      ...params
    });

    const messages = response.data.messages || [];
    
    emitProgress(0.8, 1.0, 'Processing message details...');
    
    // Get full message details for each message
    const detailedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });
        return detail.data;
      })
    );

    emitProgress(0.9, 1.0, 'Formatting response...');
    
    const formattedMessages = detailedMessages.map((msg: any) => {
      const headers = extractHeaders(msg.payload);
      const content = extractEmailContent(msg.payload);
      
      return {
        id: msg.id,
        threadId: msg.threadId,
        labelIds: msg.labelIds,
        snippet: msg.snippet,
        internalDate: msg.internalDate,
        sizeEstimate: msg.sizeEstimate,
        subject: headers.subject || '',
        from: headers.from || '',
        to: headers.to || '',
        cc: headers.cc || '',
        date: headers.date || '',
        body: content.body,
        format: content.format,
        isRead: !msg.labelIds.includes('UNREAD')
      };
    });

    emitProgress(1.0, 1.0, 'Gmail messages fetched successfully');
    
    return {
      messages: formattedMessages,
      resultSizeEstimate: response.data.resultSizeEstimate,
      nextPageToken: response.data.nextPageToken
    };
    
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to fetch Gmail messages: ${error.message}`);
  }
}

export async function handleGmailSearch(args: unknown, context: LogContext) {
  const validatedArgs = validateOrThrow(GMAIL_SEARCH_SCHEMA, args, 'gmail.search@v1') as GmailSearchArgs;
  
  emitProgress(0.3, 1.0, 'Searching Gmail messages...');
  
  try {
    const gmail = await getGmailClient();
    
    const params: any = {
      q: validatedArgs.query,
      maxResults: validatedArgs.limit || 20
    };

    if (validatedArgs.labelIds && validatedArgs.labelIds.length > 0) {
      params.labelIds = validatedArgs.labelIds;
    }

    emitProgress(0.6, 1.0, 'Executing Gmail search...');
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      ...params
    });

    const messages = response.data.messages || [];
    
    emitProgress(0.8, 1.0, 'Processing search results...');
    
    // Get full message details for each message
    const detailedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });
        return detail.data;
      })
    );

    emitProgress(0.9, 1.0, 'Formatting search results...');
    
    const formattedMessages = detailedMessages.map((msg: any) => {
      const headers = extractHeaders(msg.payload);
      const content = extractEmailContent(msg.payload);
      
      return {
        id: msg.id,
        threadId: msg.threadId,
        labelIds: msg.labelIds,
        snippet: msg.snippet,
        internalDate: msg.internalDate,
        sizeEstimate: msg.sizeEstimate,
        subject: headers.subject || '',
        from: headers.from || '',
        to: headers.to || '',
        cc: headers.cc || '',
        date: headers.date || '',
        body: content.body,
        format: content.format,
        isRead: !msg.labelIds.includes('UNREAD')
      };
    });

    emitProgress(1.0, 1.0, 'Gmail search completed successfully');
    
    return {
      messages: formattedMessages,
      resultSizeEstimate: response.data.resultSizeEstimate,
      nextPageToken: response.data.nextPageToken,
      query: validatedArgs.query
    };
    
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to search Gmail messages: ${error.message}`);
  }
}

export async function handleGmailRead(args: unknown, context: LogContext) {
  const validatedArgs = validateOrThrow(GMAIL_READ_SCHEMA, args, 'gmail.read@v1') as GmailReadArgs;
  
  emitProgress(0.3, 1.0, 'Fetching Gmail message...');
  
  try {
    const gmail = await getGmailClient();
    
    emitProgress(0.6, 1.0, 'Executing Gmail API request...');
    
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: validatedArgs.messageId,
      format: validatedArgs.format || 'full'
    });

    const msg = response.data;
    
    emitProgress(0.8, 1.0, 'Processing message content...');
    
    const headers = extractHeaders(msg.payload);
    const content = extractEmailContent(msg.payload);
    
    emitProgress(0.9, 1.0, 'Formatting message...');
    
    const formattedMessage = {
      id: msg.id,
      threadId: msg.threadId,
      labelIds: msg.labelIds,
      snippet: msg.snippet,
      internalDate: msg.internalDate,
      sizeEstimate: msg.sizeEstimate,
      subject: headers.subject || '',
      from: headers.from || '',
      to: headers.to || '',
      cc: headers.cc || '',
      bcc: headers.bcc || '',
      date: headers.date || '',
      body: content.body,
      format: content.format,
      isRead: !msg.labelIds.includes('UNREAD')
    };

    emitProgress(1.0, 1.0, 'Gmail message fetched successfully');
    
    return {
      message: formattedMessage
    };
    
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to fetch Gmail message: ${error.message}`);
  }
}

export async function handleGmailSend(args: unknown, context: LogContext) {
  const validatedArgs = validateOrThrow(GMAIL_SEND_SCHEMA, args, 'gmail.send@v1') as GmailSendArgs;
  
  emitProgress(0.2, 1.0, 'Preparing email...');
  
  try {
    const gmail = await getGmailClient();
    
    // Build email message
    const emailLines = [
      `To: ${validatedArgs.to.join(', ')}`,
      `Subject: ${validatedArgs.subject}`,
      `Content-Type: text/${validatedArgs.format || 'text'}; charset=utf-8`,
      `MIME-Version: 1.0`,
      ''
    ];

    if (validatedArgs.cc && validatedArgs.cc.length > 0) {
      emailLines.splice(2, 0, `Cc: ${validatedArgs.cc.join(', ')}`);
    }

    if (validatedArgs.bcc && validatedArgs.bcc.length > 0) {
      emailLines.splice(2, 0, `Bcc: ${validatedArgs.bcc.join(', ')}`);
    }

    emailLines.push(validatedArgs.body);
    
    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    
    emitProgress(0.6, 1.0, 'Sending email...');
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    emitProgress(1.0, 1.0, 'Email sent successfully');
    
    return {
      messageId: response.data.id,
      threadId: response.data.threadId,
      labelIds: response.data.labelIds,
      message: 'Email sent successfully'
    };
    
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to send Gmail message: ${error.message}`);
  }
} 