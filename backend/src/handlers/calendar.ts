import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { buildICS, createSimpleEvent, ICSCalendar } from '../utils/ics.js';
import { emitProgress } from '../utils/logger.js';

export interface CalendarCreateICSArgs {
  title: string;
  events: Array<{
    summary: string;
    start: string; // ISO date string
    end: string;   // ISO date string
    description?: string;
    location?: string;
  }>;
  prodid?: string;
}

const calendarCreateICSSchema: JSONSchemaType<CalendarCreateICSArgs> = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          summary: { type: 'string', minLength: 1 },
          start: { type: 'string' },
          end: { type: 'string' },
          description: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
        },
        required: ['summary', 'start', 'end'],
        additionalProperties: false,
      },
      minItems: 1,
    },
    prodid: { type: 'string', nullable: true },
  },
  required: ['title', 'events'],
  additionalProperties: false,
};

export async function handleCalendarCreateICS(
  args: unknown,
  context: { traceId: string }
): Promise<{ content: Array<{ type: string; text?: string; data?: any }> }> {
  emitProgress(1, 3, 'validating input');
  
  const validatedArgs = validateOrThrow(
    calendarCreateICSSchema,
    args,
    'calendar.create_ics@v1'
  );

  emitProgress(2, 3, 'creating calendar');

  // Convert string dates to Date objects and validate
  const events = validatedArgs.events.map((event, index) => {
    const start = new Date(event.start);
    const end = new Date(event.end);

    if (isNaN(start.getTime())) {
      throw new Error(`Invalid start date for event ${index}: ${event.start}`);
    }
    if (isNaN(end.getTime())) {
      throw new Error(`Invalid end date for event ${index}: ${event.end}`);
    }
    if (start >= end) {
      throw new Error(`Event ${index} start time must be before end time`);
    }

    return createSimpleEvent(
      event.summary,
      start,
      end,
      event.description,
      event.location
    );
  });

  const calendar: ICSCalendar = {
    prodid: validatedArgs.prodid || `-//Oasis Hub//Calendar Generator//EN`,
    version: '2.0',
    calscale: 'GREGORIAN',
    events,
  };

  const icsContent = buildICS(calendar);

  emitProgress(3, 3, 'generated ICS file');

  // Generate a filename using the trace ID for uniqueness
  const filename = `calendar_${context.traceId}.ics`;

  return {
    content: [
      {
        type: 'text',
        text: `Successfully created ICS calendar with ${events.length} event(s). Calendar title: "${validatedArgs.title}"`,
      },
      {
        type: 'json',
        data: {
          filename,
          icsContent,
          eventCount: events.length,
          calendarTitle: validatedArgs.title,
        },
      },
    ],
  };
}