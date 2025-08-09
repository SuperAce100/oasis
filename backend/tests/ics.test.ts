import { describe, it, expect } from 'vitest';
import { buildICS, createSimpleEvent, ICSCalendar } from '../src/utils/ics.js';

describe('ICS Utils', () => {
  describe('createSimpleEvent', () => {
    it('should create a simple event with required fields', () => {
      const start = new Date('2024-01-15T10:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');
      
      const event = createSimpleEvent('Test Meeting', start, end);
      
      expect(event.summary).toBe('Test Meeting');
      expect(event.dtstart).toEqual(start);
      expect(event.dtend).toEqual(end);
      expect(event.uid).toMatch(/^\d+-[a-z0-9]+@oasis-hub$/);
    });

    it('should create event with optional fields', () => {
      const start = new Date('2024-01-15T10:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');
      
      const event = createSimpleEvent(
        'Test Meeting', 
        start, 
        end,
        'This is a test meeting',
        'Conference Room A'
      );
      
      expect(event.description).toBe('This is a test meeting');
      expect(event.location).toBe('Conference Room A');
    });
  });

  describe('buildICS', () => {
    it('should build a valid ICS calendar with single event', () => {
      const start = new Date('2024-01-15T10:00:00.000Z');
      const end = new Date('2024-01-15T11:00:00.000Z');
      
      const calendar: ICSCalendar = {
        prodid: '-//Test//Test Calendar//EN',
        version: '2.0',
        events: [createSimpleEvent('Test Event', start, end)],
      };

      const ics = buildICS(calendar);
      
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//Test//Test Calendar//EN');
      expect(ics).toContain('CALSCALE:GREGORIAN');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Test Event');
      expect(ics).toContain('DTSTART:20240115T100000Z');
      expect(ics).toContain('DTEND:20240115T110000Z');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should escape special characters in text fields', () => {
      const start = new Date('2024-01-15T10:00:00.000Z');
      const end = new Date('2024-01-15T11:00:00.000Z');
      
      const calendar: ICSCalendar = {
        prodid: '-//Test//Test Calendar//EN',
        version: '2.0',
        events: [createSimpleEvent(
          'Meeting; with, special: chars\nand newlines',
          start,
          end,
          'Description with\nline breaks, commas; and\\backslashes'
        )],
      };

      const ics = buildICS(calendar);
      
      expect(ics).toContain('SUMMARY:Meeting\\; with\\, special: chars\\nand newlines');
      expect(ics).toContain('DESCRIPTION:Description with\\nline breaks\\, commas\\; and\\\\backslashes');
    });

    it('should handle multiple events', () => {
      const calendar: ICSCalendar = {
        prodid: '-//Test//Test Calendar//EN',
        version: '2.0',
        events: [
          createSimpleEvent('Event 1', new Date('2024-01-15T10:00:00Z'), new Date('2024-01-15T11:00:00Z')),
          createSimpleEvent('Event 2', new Date('2024-01-16T14:00:00Z'), new Date('2024-01-16T15:00:00Z')),
        ],
      };

      const ics = buildICS(calendar);
      
      const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(2);
      expect(ics).toContain('SUMMARY:Event 1');
      expect(ics).toContain('SUMMARY:Event 2');
    });

    it('should include organizer and attendees if provided', () => {
      const start = new Date('2024-01-15T10:00:00.000Z');
      const end = new Date('2024-01-15T11:00:00.000Z');
      
      const event = createSimpleEvent('Meeting', start, end);
      event.organizer = { name: 'John Doe', email: 'john@example.com' };
      event.attendees = [
        { name: 'Jane Smith', email: 'jane@example.com' },
        { name: 'Bob Wilson', email: 'bob@example.com' },
      ];

      const calendar: ICSCalendar = {
        prodid: '-//Test//Test Calendar//EN',
        version: '2.0',
        events: [event],
      };

      const ics = buildICS(calendar);
      
      expect(ics).toContain('ORGANIZER;CN=John Doe:mailto:john@example.com');
      expect(ics).toContain('ATTENDEE;CN=Jane Smith:mailto:jane@example.com');
      expect(ics).toContain('ATTENDEE;CN=Bob Wilson:mailto:bob@example.com');
    });

    it('should end lines with CRLF', () => {
      const calendar: ICSCalendar = {
        prodid: '-//Test//Test Calendar//EN',
        version: '2.0',
        events: [createSimpleEvent('Test', new Date(), new Date())],
      };

      const ics = buildICS(calendar);
      
      expect(ics).toMatch(/\r\n/);
      // Test that the string contains CRLF line endings
      const lines = ics.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);
    });
  });
});