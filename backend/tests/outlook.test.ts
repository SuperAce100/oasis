import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  handleCalendarList,
  handleCalendarCreate,
  handleCalendarDelete,
  handleEmailList,
  handleEmailSend
} from '../src/handlers/outlook.js';
import * as graphAPI from '../src/utils/graph-api.js';

// Mock the graph API module
vi.mock('../src/utils/graph-api.js');
const mockCallGraphAPI = vi.mocked(graphAPI.callGraphAPI);
const mockBuildODataParams = vi.mocked(graphAPI.buildODataParams);

describe('Outlook Handlers', () => {
  const mockContext = { traceId: 'test-trace-id' };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock buildODataParams to return params as expected
    mockBuildODataParams.mockImplementation((options) => {
      const params: Record<string, string> = {};
      if (options.select) params['$select'] = options.select.join(',');
      if (options.filter) params['$filter'] = options.filter;
      if (options.orderBy) params['$orderby'] = options.orderBy;
      if (options.top) params['$top'] = options.top.toString();
      if (options.skip) params['$skip'] = options.skip.toString();
      return params;
    });
  });

  describe('Calendar Handlers', () => {
    describe('handleCalendarList', () => {
      it('should list calendar events successfully', async () => {
        const mockResponse = {
          value: [
            {
              id: 'event-1',
              subject: 'Test Meeting',
              start: { dateTime: '2024-08-10T10:00:00Z', timeZone: 'UTC' },
              end: { dateTime: '2024-08-10T11:00:00Z', timeZone: 'UTC' },
              location: { displayName: 'Conference Room A' },
              bodyPreview: 'Meeting about testing',
              organizer: { emailAddress: { name: 'John Doe', address: 'john@test.com' } },
              attendees: [{ emailAddress: { address: 'jane@test.com' } }],
              isOnlineMeeting: false
            }
          ]
        };

        mockCallGraphAPI.mockResolvedValue(mockResponse);

        const result = await handleCalendarList({ limit: 5 }, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'GET',
          endpoint: 'me/events',
          params: expect.objectContaining({
            '$top': '5',
            '$orderby': 'start/dateTime',
            '$select': 'id,subject,start,end,location,bodyPreview,organizer,attendees,isOnlineMeeting'
          })
        });

        expect(result.content[0].data.events).toHaveLength(1);
        expect(result.content[0].data.events[0]).toEqual({
          id: 'event-1',
          subject: 'Test Meeting',
          start: { dateTime: '2024-08-10T10:00:00Z', timeZone: 'UTC' },
          end: { dateTime: '2024-08-10T11:00:00Z', timeZone: 'UTC' },
          location: 'Conference Room A',
          bodyPreview: 'Meeting about testing',
          organizer: { name: 'John Doe', address: 'john@test.com' },
          attendeeCount: 1,
          isOnlineMeeting: false
        });
      });

      it('should handle empty calendar response', async () => {
        mockCallGraphAPI.mockResolvedValue({ value: [] });

        const result = await handleCalendarList({ limit: 5 }, mockContext);

        expect(result.content[0].data.events).toHaveLength(0);
        expect(result.content[0].data.total).toBe(0);
      });

      it('should apply filters correctly', async () => {
        mockCallGraphAPI.mockResolvedValue({ value: [] });

        await handleCalendarList({
          start: '2024-08-10T00:00:00Z',
          end: '2024-08-10T23:59:59Z',
          query: 'meeting',
          includeCancelled: false,
          limit: 10,
          orderBy: 'createdDateTime'
        }, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'GET',
          endpoint: 'me/events',
          params: expect.objectContaining({
            '$filter': "start/dateTime ge '2024-08-10T00:00:00Z' and end/dateTime le '2024-08-10T23:59:59Z' and isCancelled eq false and contains(subject,'meeting')",
            '$orderby': 'createdDateTime',
            '$top': '10'
          })
        });
      });

      it('should validate input parameters', async () => {
        await expect(handleCalendarList({ limit: 101 }, mockContext))
          .rejects.toThrow('calendar.list@v1');
      });
    });

    describe('handleCalendarCreate', () => {
      it('should create calendar event successfully', async () => {
        const mockResponse = {
          id: 'new-event-id',
          subject: 'New Meeting',
          start: { dateTime: '2024-08-10T10:00:00Z', timeZone: 'UTC' },
          end: { dateTime: '2024-08-10T11:00:00Z', timeZone: 'UTC' },
          webLink: 'https://outlook.office365.com/event-link',
          onlineMeeting: null
        };

        mockCallGraphAPI.mockResolvedValue(mockResponse);

        const args = {
          subject: 'New Meeting',
          start: '2024-08-10T10:00:00Z',
          end: '2024-08-10T11:00:00Z',
          body: 'Meeting description',
          location: 'Conference Room B',
          attendees: [
            { email: 'john@test.com', type: 'required' },
            { email: 'jane@test.com', type: 'optional' }
          ]
        };

        const result = await handleCalendarCreate(args, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'POST',
          endpoint: 'me/events',
          data: expect.objectContaining({
            subject: 'New Meeting',
            body: { contentType: 'text', content: 'Meeting description' },
            start: { dateTime: '2024-08-10T10:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-08-10T11:00:00Z', timeZone: 'UTC' },
            location: { displayName: 'Conference Room B' },
            attendees: [
              {
                emailAddress: { address: 'john@test.com', name: 'john@test.com' },
                type: 'required'
              },
              {
                emailAddress: { address: 'jane@test.com', name: 'jane@test.com' },
                type: 'optional'
              }
            ]
          })
        });

        expect(result.content[0].data.success).toBe(true);
        expect(result.content[0].data.id).toBe('new-event-id');
      });

      it('should validate required fields', async () => {
        await expect(handleCalendarCreate({ subject: 'Test' }, mockContext))
          .rejects.toThrow('calendar.create@v1');
      });
    });

    describe('handleCalendarDelete', () => {
      it('should delete calendar event successfully', async () => {
        mockCallGraphAPI.mockResolvedValue(undefined);

        const result = await handleCalendarDelete({ eventId: 'event-123' }, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'DELETE',
          endpoint: 'me/events/event-123'
        });

        expect(result.content[0].data.success).toBe(true);
        expect(result.content[0].data.eventId).toBe('event-123');
      });

      it('should validate eventId parameter', async () => {
        await expect(handleCalendarDelete({}, mockContext))
          .rejects.toThrow('calendar.delete@v1');
      });
    });
  });

  describe('Email Handlers', () => {
    describe('handleEmailList', () => {
      it('should list emails successfully', async () => {
        const mockResponse = {
          value: [
            {
              id: 'email-1',
              subject: 'Test Email',
              from: { emailAddress: { name: 'John Doe', address: 'john@test.com' } },
              receivedDateTime: '2024-08-10T10:00:00Z',
              isRead: false,
              hasAttachments: true,
              bodyPreview: 'This is a test email',
              importance: 'normal'
            }
          ]
        };

        mockCallGraphAPI.mockResolvedValue(mockResponse);

        const result = await handleEmailList({ limit: 10 }, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'GET',
          endpoint: 'me/messages',
          params: expect.objectContaining({
            '$top': '10',
            '$orderby': 'receivedDateTime desc',
            '$select': 'id,subject,from,receivedDateTime,isRead,hasAttachments,bodyPreview,importance'
          })
        });

        expect(result.content[0].data.messages).toHaveLength(1);
        expect(result.content[0].data.messages[0]).toEqual({
          id: 'email-1',
          subject: 'Test Email',
          from: { name: 'John Doe', address: 'john@test.com' },
          receivedDateTime: '2024-08-10T10:00:00Z',
          isRead: false,
          hasAttachments: true,
          bodyPreview: 'This is a test email',
          importance: 'normal'
        });
      });

      it('should apply email filters', async () => {
        mockCallGraphAPI.mockResolvedValue({ value: [] });

        await handleEmailList({
          from: 'john@test.com',
          unreadOnly: true,
          query: 'urgent',
          limit: 5
        }, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'GET',
          endpoint: 'me/messages',
          params: expect.objectContaining({
            '$filter': "from/emailAddress/address eq 'john@test.com' and isRead eq false and contains(subject,'urgent')",
            '$top': '5'
          })
        });
      });
    });

    describe('handleEmailSend', () => {
      it('should send email successfully', async () => {
        mockCallGraphAPI.mockResolvedValue(undefined);

        const args = {
          to: ['recipient@test.com'],
          subject: 'Test Subject',
          body: 'Test email body',
          cc: ['cc@test.com'],
          format: 'html'
        };

        const result = await handleEmailSend(args, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'POST',
          endpoint: 'me/sendMail',
          data: {
            message: {
              subject: 'Test Subject',
              body: { contentType: 'html', content: 'Test email body' },
              toRecipients: [{ emailAddress: { address: 'recipient@test.com' } }],
              ccRecipients: [{ emailAddress: { address: 'cc@test.com' } }],
              bccRecipients: [],
              attachments: []
            }
          }
        });

        expect(result.content[0].data.success).toBe(true);
        expect(result.content[0].data.to).toEqual(['recipient@test.com']);
      });

      it('should validate required email fields', async () => {
        await expect(handleEmailSend({ subject: 'Test' }, mockContext))
          .rejects.toThrow('email.send@v1');
      });

      it('should handle attachments', async () => {
        mockCallGraphAPI.mockResolvedValue(undefined);

        const args = {
          to: ['recipient@test.com'],
          subject: 'Test with attachment',
          body: 'Email with file',
          attachments: [
            {
              filename: 'test.txt',
              contentBytes: 'VGVzdCBjb250ZW50', // Base64 for "Test content"
              mimeType: 'text/plain'
            }
          ]
        };

        await handleEmailSend(args, mockContext);

        expect(mockCallGraphAPI).toHaveBeenCalledWith({
          method: 'POST',
          endpoint: 'me/sendMail',
          data: {
            message: expect.objectContaining({
              attachments: [
                {
                  '@odata.type': '#microsoft.graph.fileAttachment',
                  name: 'test.txt',
                  contentBytes: 'VGVzdCBjb250ZW50',
                  contentType: 'text/plain'
                }
              ]
            })
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Graph API errors', async () => {
      const graphError = new Error('Graph API error');
      mockCallGraphAPI.mockRejectedValue(graphError);

      await expect(handleCalendarList({ limit: 5 }, mockContext))
        .rejects.toThrow('Failed to list calendar events: Graph API error');
    });
  });
});