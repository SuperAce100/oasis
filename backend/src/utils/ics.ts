export interface ICSEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
  }>;
}

export interface ICSCalendar {
  prodid: string;
  version: string;
  calscale?: string;
  method?: string;
  events: ICSEvent[];
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function foldLine(line: string, maxLength: number = 75): string {
  if (line.length <= maxLength) {
    return line;
  }

  const lines: string[] = [];
  let currentLine = line;

  while (currentLine.length > maxLength) {
    lines.push(currentLine.substring(0, maxLength));
    currentLine = ' ' + currentLine.substring(maxLength);
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines.join('\r\n');
}

export function buildICS(calendar: ICSCalendar): string {
  const lines: string[] = [];

  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push(`VERSION:${calendar.version}`);
  lines.push(`PRODID:${calendar.prodid}`);
  lines.push(`CALSCALE:${calendar.calscale || 'GREGORIAN'}`);
  
  if (calendar.method) {
    lines.push(`METHOD:${calendar.method}`);
  }

  // Events
  for (const event of calendar.events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTART:${formatDate(event.dtstart)}`);
    lines.push(`DTEND:${formatDate(event.dtend)}`);
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    
    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }
    
    if (event.organizer) {
      lines.push(`ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`);
    }
    
    if (event.attendees) {
      for (const attendee of event.attendees) {
        lines.push(`ATTENDEE;CN=${escapeText(attendee.name)}:mailto:${attendee.email}`);
      }
    }
    
    lines.push(`DTSTAMP:${formatDate(new Date())}`);
    lines.push('END:VEVENT');
  }

  // Calendar footer
  lines.push('END:VCALENDAR');

  // Fold long lines and join with CRLF
  return lines.map(line => foldLine(line)).join('\r\n');
}

export function createSimpleEvent(
  summary: string,
  start: Date,
  end: Date,
  description?: string,
  location?: string
): ICSEvent {
  return {
    uid: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@oasis-hub`,
    summary,
    description,
    dtstart: start,
    dtend: end,
    location,
  };
}