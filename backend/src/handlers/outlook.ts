import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { callGraphAPI, buildODataParams } from '../utils/graph-api.js';
import { BAD_REQUEST, INTERNAL_ERROR } from '../utils/errors.js';
import type { LogContext } from '../utils/logger.js';
import { emitProgress } from '../utils/logger.js';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CalendarListArgs {
  calendarId?: string;
  start?: string;
  end?: string;
  query?: string;
  includeCancelled?: boolean;
  limit?: number;
  orderBy?: 'start' | 'createdDateTime';
}

export interface CalendarCreateArgs {
  calendarId?: string;
  subject: string;
  body?: string;
  start: string;
  end: string;
  attendees?: Array<{ email: string; type?: 'required' | 'optional' }>;
  location?: string;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness';
  reminderMinutesBeforeStart?: number;
}

export interface CalendarDeleteArgs {
  eventId: string;
  calendarId?: string;
  sendCancellations?: boolean;
}

export interface CalendarResponseArgs {
  eventId: string;
  calendarId?: string;
  comment?: string;
  sendResponse?: boolean;
}

export interface EmailListArgs {
  mailboxId?: string;
  folderId?: string;
  query?: string;
  from?: string;
  unreadOnly?: boolean;
  limit?: number;
  orderBy?: 'receivedDateTime' | 'subject';
}

export interface EmailSearchArgs {
  mailboxId?: string;
  query: string;
  from?: string;
  to?: string;
  subjectContains?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface EmailReadArgs {
  messageId: string;
  mailboxId?: string;
  format?: 'html' | 'text';
}

export interface EmailSendArgs {
  mailboxId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  format?: 'html' | 'text';
  attachments?: Array<{
    filename: string;
    contentBytes: string;
    mimeType?: string;
  }>;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const CALENDAR_LIST_SCHEMA: JSONSchemaType<CalendarListArgs> = {
  type: 'object',
  properties: {
    calendarId: { type: 'string', nullable: true },
    start: { type: 'string', nullable: true },
    end: { type: 'string', nullable: true },
    query: { type: 'string', nullable: true },
    includeCancelled: { type: 'boolean', nullable: true },
    limit: { type: 'number', minimum: 1, maximum: 100, nullable: true },
    orderBy: { type: 'string', enum: ['start', 'createdDateTime'], nullable: true }
  },
  required: [],
  additionalProperties: false
};

const CALENDAR_CREATE_SCHEMA: JSONSchemaType<CalendarCreateArgs> = {
  type: 'object',
  properties: {
    calendarId: { type: 'string', nullable: true },
    subject: { type: 'string', minLength: 1 },
    body: { type: 'string', nullable: true },
    start: { type: 'string' },
    end: { type: 'string' },
    attendees: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          type: { type: 'string', enum: ['required', 'optional'], nullable: true }
        },
        required: ['email'],
        additionalProperties: false
      },
      nullable: true
    },
    location: { type: 'string', nullable: true },
    isOnlineMeeting: { type: 'boolean', nullable: true },
    onlineMeetingProvider: { type: 'string', enum: ['teamsForBusiness', 'skypeForBusiness'], nullable: true },
    reminderMinutesBeforeStart: { type: 'number', minimum: 0, nullable: true }
  },
  required: ['subject', 'start', 'end'],
  additionalProperties: false
};

const CALENDAR_DELETE_SCHEMA: JSONSchemaType<CalendarDeleteArgs> = {
  type: 'object',
  properties: {
    eventId: { type: 'string', minLength: 1 },
    calendarId: { type: 'string', nullable: true },
    sendCancellations: { type: 'boolean', nullable: true }
  },
  required: ['eventId'],
  additionalProperties: false
};

const CALENDAR_RESPONSE_SCHEMA: JSONSchemaType<CalendarResponseArgs> = {
  type: 'object',
  properties: {
    eventId: { type: 'string', minLength: 1 },
    calendarId: { type: 'string', nullable: true },
    comment: { type: 'string', nullable: true },
    sendResponse: { type: 'boolean', nullable: true }
  },
  required: ['eventId'],
  additionalProperties: false
};

const EMAIL_LIST_SCHEMA: JSONSchemaType<EmailListArgs> = {
  type: 'object',
  properties: {
    mailboxId: { type: 'string', nullable: true },
    folderId: { type: 'string', nullable: true },
    query: { type: 'string', nullable: true },
    from: { type: 'string', nullable: true },
    unreadOnly: { type: 'boolean', nullable: true },
    limit: { type: 'number', minimum: 1, maximum: 100, nullable: true },
    orderBy: { type: 'string', enum: ['receivedDateTime', 'subject'], nullable: true }
  },
  required: [],
  additionalProperties: false
};

const EMAIL_SEARCH_SCHEMA: JSONSchemaType<EmailSearchArgs> = {
  type: 'object',
  properties: {
    mailboxId: { type: 'string', nullable: true },
    query: { type: 'string', minLength: 1 },
    from: { type: 'string', nullable: true },
    to: { type: 'string', nullable: true },
    subjectContains: { type: 'string', nullable: true },
    since: { type: 'string', nullable: true },
    until: { type: 'string', nullable: true },
    limit: { type: 'number', minimum: 1, maximum: 100, nullable: true }
  },
  required: ['query'],
  additionalProperties: false
};

const EMAIL_READ_SCHEMA: JSONSchemaType<EmailReadArgs> = {
  type: 'object',
  properties: {
    messageId: { type: 'string', minLength: 1 },
    mailboxId: { type: 'string', nullable: true },
    format: { type: 'string', enum: ['html', 'text'], nullable: true }
  },
  required: ['messageId'],
  additionalProperties: false
};

const EMAIL_SEND_SCHEMA: JSONSchemaType<EmailSendArgs> = {
  type: 'object',
  properties: {
    mailboxId: { type: 'string', nullable: true },
    to: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    cc: {
      type: 'array',
      items: { type: 'string' },
      nullable: true
    },
    bcc: {
      type: 'array',
      items: { type: 'string' },
      nullable: true
    },
    subject: { type: 'string', minLength: 1 },
    body: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: ['html', 'text'], nullable: true },
    attachments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          filename: { type: 'string', minLength: 1 },
          contentBytes: { type: 'string' },
          mimeType: { type: 'string', nullable: true }
        },
        required: ['filename', 'contentBytes'],
        additionalProperties: false
      },
      nullable: true
    }
  },
  required: ['to', 'subject', 'body'],
  additionalProperties: false
};

// ============================================================================
// CALENDAR HANDLERS
// ============================================================================

export async function handleCalendarList(args: unknown, context: LogContext) {
  emitProgress(1, 3, 'validating calendar list parameters');
  const validatedArgs = validateOrThrow(CALENDAR_LIST_SCHEMA, args, 'calendar.list@v1');

  const {
    calendarId,
    start,
    end,
    query,
    includeCancelled = false,
    limit = 20,
    orderBy = 'start'
  } = validatedArgs;

  emitProgress(2, 3, 'fetching calendar events');

  try {
    const filters = [];
    
    if (start) {
      filters.push(`start/dateTime ge '${start}'`);
    }
    if (end) {
      filters.push(`end/dateTime le '${end}'`);
    }
    if (!includeCancelled) {
      filters.push(`isCancelled eq false`);
    }
    if (query) {
      filters.push(`contains(subject,'${query.replace(/'/g, "''")}')`);
    }

    const params = buildODataParams({
      select: ['id', 'subject', 'start', 'end', 'location', 'bodyPreview', 'organizer', 'attendees', 'isOnlineMeeting'],
      filter: filters.length > 0 ? filters.join(' and ') : undefined,
      orderBy: orderBy === 'start' ? 'start/dateTime' : 'createdDateTime',
      top: limit
    });

    const endpoint = calendarId ? `me/calendars/${calendarId}/events` : 'me/events';
    const response = await callGraphAPI({
      method: 'GET',
      endpoint,
      params
    });

    const events = response.value || [];
    
    emitProgress(3, 3, 'formatting results');

    return {
      content: [{
        type: 'json',
        data: {
          events: events.map((event: any) => ({
            id: event.id,
            subject: event.subject,
            start: event.start,
            end: event.end,
            location: event.location?.displayName || null,
            bodyPreview: event.bodyPreview,
            organizer: event.organizer?.emailAddress,
            attendeeCount: event.attendees?.length || 0,
            isOnlineMeeting: event.isOnlineMeeting
          })),
          total: events.length
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to list calendar events: ${error.message}`);
  }
}

export async function handleCalendarCreate(args: unknown, context: LogContext) {
  emitProgress(1, 3, 'validating calendar creation parameters');
  const validatedArgs = validateOrThrow(CALENDAR_CREATE_SCHEMA, args, 'calendar.create@v1');

  const {
    calendarId,
    subject,
    body,
    start,
    end,
    attendees = [],
    location,
    isOnlineMeeting = false,
    onlineMeetingProvider,
    reminderMinutesBeforeStart = 15
  } = validatedArgs;

  emitProgress(2, 3, 'creating calendar event');

  try {
    const eventData = {
      subject,
      body: {
        contentType: 'text',
        content: body || ''
      },
      start: {
        dateTime: start,
        timeZone: 'UTC'
      },
      end: {
        dateTime: end,
        timeZone: 'UTC'
      },
      attendees: attendees.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.email
        },
        type: attendee.type || 'required'
      })),
      location: location ? {
        displayName: location
      } : undefined,
      isOnlineMeeting,
      onlineMeetingProvider: isOnlineMeeting ? (onlineMeetingProvider || 'teamsForBusiness') : undefined,
      reminderMinutesBeforeStart
    };

    const endpoint = calendarId ? `me/calendars/${calendarId}/events` : 'me/events';
    const response = await callGraphAPI({
      method: 'POST',
      endpoint,
      data: eventData
    });

    emitProgress(3, 3, 'event created successfully');

    return {
      content: [{
        type: 'json',
        data: {
          id: response.id,
          subject: response.subject,
          start: response.start,
          end: response.end,
          webLink: response.webLink,
          onlineMeeting: response.onlineMeeting,
          success: true
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to create calendar event: ${error.message}`);
  }
}

export async function handleCalendarDelete(args: unknown, context: LogContext) {
  emitProgress(1, 2, 'validating calendar deletion parameters');
  const validatedArgs = validateOrThrow(CALENDAR_DELETE_SCHEMA, args, 'calendar.delete@v1');

  const { eventId, calendarId } = validatedArgs;

  emitProgress(2, 2, 'deleting calendar event');

  try {
    const endpoint = calendarId ? `me/calendars/${calendarId}/events/${eventId}` : `me/events/${eventId}`;
    
    await callGraphAPI({
      method: 'DELETE',
      endpoint
    });

    return {
      content: [{
        type: 'json',
        data: {
          success: true,
          eventId,
          message: 'Event deleted successfully'
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to delete calendar event: ${error.message}`);
  }
}

export async function handleCalendarCancel(args: unknown, context: LogContext) {
  emitProgress(1, 2, 'validating calendar cancellation parameters');
  const validatedArgs = validateOrThrow(CALENDAR_RESPONSE_SCHEMA, args, 'calendar.cancel@v1');

  const { eventId, calendarId, comment } = validatedArgs;

  emitProgress(2, 2, 'cancelling calendar event');

  try {
    const endpoint = calendarId ? `me/calendars/${calendarId}/events/${eventId}/cancel` : `me/events/${eventId}/cancel`;
    
    await callGraphAPI({
      method: 'POST',
      endpoint,
      data: {
        comment: comment || 'Event cancelled'
      }
    });

    return {
      content: [{
        type: 'json',
        data: {
          success: true,
          eventId,
          message: 'Event cancelled and notifications sent'
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to cancel calendar event: ${error.message}`);
  }
}

export async function handleCalendarAccept(args: unknown, context: LogContext) {
  emitProgress(1, 2, 'validating calendar acceptance parameters');
  const validatedArgs = validateOrThrow(CALENDAR_RESPONSE_SCHEMA, args, 'calendar.accept@v1');

  const { eventId, calendarId, comment, sendResponse = true } = validatedArgs;

  emitProgress(2, 2, 'accepting calendar event');

  try {
    const endpoint = calendarId ? `me/calendars/${calendarId}/events/${eventId}/accept` : `me/events/${eventId}/accept`;
    
    await callGraphAPI({
      method: 'POST',
      endpoint,
      data: {
        comment: comment || '',
        sendResponse
      }
    });

    return {
      content: [{
        type: 'json',
        data: {
          response: 'accepted',
          success: true,
          eventId
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to accept calendar event: ${error.message}`);
  }
}

export async function handleCalendarTentative(args: unknown, context: LogContext) {
  emitProgress(1, 2, 'validating calendar tentative parameters');
  const validatedArgs = validateOrThrow(CALENDAR_RESPONSE_SCHEMA, args, 'calendar.tentative@v1');

  const { eventId, calendarId, comment, sendResponse = true } = validatedArgs;

  emitProgress(2, 2, 'tentatively accepting calendar event');

  try {
    const endpoint = calendarId ? `me/calendars/${calendarId}/events/${eventId}/tentativelyAccept` : `me/events/${eventId}/tentativelyAccept`;
    
    await callGraphAPI({
      method: 'POST',
      endpoint,
      data: {
        comment: comment || '',
        sendResponse
      }
    });

    return {
      content: [{
        type: 'json',
        data: {
          response: 'tentative',
          success: true,
          eventId
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to tentatively accept calendar event: ${error.message}`);
  }
}

export async function handleCalendarDecline(args: unknown, context: LogContext) {
  emitProgress(1, 2, 'validating calendar decline parameters');
  const validatedArgs = validateOrThrow(CALENDAR_RESPONSE_SCHEMA, args, 'calendar.decline@v1');

  const { eventId, calendarId, comment, sendResponse = true } = validatedArgs;

  emitProgress(2, 2, 'declining calendar event');

  try {
    const endpoint = calendarId ? `me/calendars/${calendarId}/events/${eventId}/decline` : `me/events/${eventId}/decline`;
    
    await callGraphAPI({
      method: 'POST',
      endpoint,
      data: {
        comment: comment || '',
        sendResponse
      }
    });

    return {
      content: [{
        type: 'json',
        data: {
          response: 'declined',
          success: true,
          eventId
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to decline calendar event: ${error.message}`);
  }
}

// ============================================================================
// EMAIL HANDLERS
// ============================================================================

export async function handleEmailList(args: unknown, context: LogContext) {
  emitProgress(1, 3, 'validating email list parameters');
  const validatedArgs = validateOrThrow(EMAIL_LIST_SCHEMA, args, 'email.list@v1');

  const {
    mailboxId,
    folderId,
    query,
    from,
    unreadOnly = false,
    limit = 20,
    orderBy = 'receivedDateTime'
  } = validatedArgs;

  emitProgress(2, 3, 'fetching emails');

  try {
    const filters = [];
    
    if (from) {
      filters.push(`from/emailAddress/address eq '${from.replace(/'/g, "''")}'`);
    }
    if (unreadOnly) {
      filters.push(`isRead eq false`);
    }
    if (query) {
      filters.push(`contains(subject,'${query.replace(/'/g, "''")}')`);
    }

    const params = buildODataParams({
      select: ['id', 'subject', 'from', 'receivedDateTime', 'isRead', 'hasAttachments', 'bodyPreview', 'importance'],
      filter: filters.length > 0 ? filters.join(' and ') : undefined,
      orderBy: `${orderBy} desc`,
      top: limit
    });

    let endpoint = 'me/messages';
    if (mailboxId && folderId) {
      endpoint = `me/mailFolders/${folderId}/messages`;
    } else if (folderId) {
      endpoint = `me/mailFolders/${folderId}/messages`;
    }

    const response = await callGraphAPI({
      method: 'GET',
      endpoint,
      params
    });

    const messages = response.value || [];
    
    emitProgress(3, 3, 'formatting email results');

    return {
      content: [{
        type: 'json',
        data: {
          messages: messages.map((msg: any) => ({
            id: msg.id,
            subject: msg.subject,
            from: msg.from?.emailAddress,
            receivedDateTime: msg.receivedDateTime,
            isRead: msg.isRead,
            hasAttachments: msg.hasAttachments,
            bodyPreview: msg.bodyPreview,
            importance: msg.importance
          })),
          total: messages.length
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to list emails: ${error.message}`);
  }
}

export async function handleEmailSearch(args: unknown, context: LogContext) {
  emitProgress(1, 3, 'validating email search parameters');
  const validatedArgs = validateOrThrow(EMAIL_SEARCH_SCHEMA, args, 'email.search@v1');

  const {
    mailboxId,
    query,
    from,
    to,
    subjectContains,
    since,
    until,
    limit = 20
  } = validatedArgs;

  emitProgress(2, 3, 'searching emails');

  try {
    // Use Microsoft Graph search instead of complex OData filters
    const params = {
      '$search': `"${query.replace(/"/g, '\\"')}"`,
      '$top': limit.toString(),
      '$select': 'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview'
      // Note: $orderby is not supported with $search in Graph API
    };

    const response = await callGraphAPI({
      method: 'GET',
      endpoint: 'me/messages',
      params
    });

    const messages = response.value || [];
    
    emitProgress(3, 3, 'formatting search results');

    return {
      content: [{
        type: 'json',
        data: {
          messages: messages.map((msg: any) => ({
            id: msg.id,
            subject: msg.subject,
            from: msg.from?.emailAddress,
            to: msg.toRecipients?.map((r: any) => r.emailAddress),
            receivedDateTime: msg.receivedDateTime,
            isRead: msg.isRead,
            hasAttachments: msg.hasAttachments,
            bodyPreview: msg.bodyPreview
          })),
          total: messages.length,
          query
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to search emails: ${error.message}`);
  }
}

export async function handleEmailRead(args: unknown, context: LogContext) {
  emitProgress(1, 2, 'validating email read parameters');
  const validatedArgs = validateOrThrow(EMAIL_READ_SCHEMA, args, 'email.read@v1');

  const { messageId, mailboxId, format = 'html' } = validatedArgs;

  emitProgress(2, 2, 'fetching email content');

  try {
    const response = await callGraphAPI({
      method: 'GET',
      endpoint: `me/messages/${messageId}`,
      params: {
        $select: 'id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,hasAttachments,importance,body,attachments'
      }
    });

    const bodyContent = format === 'text' && response.body?.content 
      ? response.body.content.replace(/<[^>]*>/g, '') // Strip HTML tags for text format
      : response.body?.content || '';

    return {
      content: [{
        type: 'json',
        data: {
          id: response.id,
          subject: response.subject,
          from: response.from?.emailAddress,
          to: response.toRecipients?.map((r: any) => r.emailAddress),
          cc: response.ccRecipients?.map((r: any) => r.emailAddress),
          bcc: response.bccRecipients?.map((r: any) => r.emailAddress),
          receivedDateTime: response.receivedDateTime,
          sentDateTime: response.sentDateTime,
          hasAttachments: response.hasAttachments,
          importance: response.importance,
          body: {
            contentType: format,
            content: bodyContent
          },
          attachments: response.attachments?.map((att: any) => ({
            id: att.id,
            name: att.name,
            contentType: att.contentType,
            size: att.size
          })) || []
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to read email: ${error.message}`);
  }
}

export async function handleEmailSend(args: unknown, context: LogContext) {
  emitProgress(1, 2, 'validating email send parameters');
  const validatedArgs = validateOrThrow(EMAIL_SEND_SCHEMA, args, 'email.send@v1');

  const {
    mailboxId,
    to,
    cc = [],
    bcc = [],
    subject,
    body,
    format = 'html',
    attachments = []
  } = validatedArgs;

  emitProgress(2, 2, 'sending email');

  try {
    const emailData = {
      message: {
        subject,
        body: {
          contentType: format,
          content: body
        },
        toRecipients: to.map((email: string) => ({
          emailAddress: {
            address: email
          }
        })),
        ccRecipients: cc.map((email: string) => ({
          emailAddress: {
            address: email
          }
        })),
        bccRecipients: bcc.map((email: string) => ({
          emailAddress: {
            address: email
          }
        })),
        attachments: attachments.map((att) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentBytes: att.contentBytes,
          contentType: att.mimeType || 'application/octet-stream'
        }))
      }
    };

    await callGraphAPI({
      method: 'POST',
      endpoint: 'me/sendMail',
      data: emailData
    });

    return {
      content: [{
        type: 'json',
        data: {
          success: true,
          message: 'Email sent successfully',
          to,
          subject
        }
      }]
    };
  } catch (error: any) {
    throw INTERNAL_ERROR(`Failed to send email: ${error.message}`);
  }
}