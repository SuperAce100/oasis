"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Search, 
  Send, 
  RefreshCw, 
  Eye, 
  Clock, 
  User, 
  Paperclip,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useBackend } from "@/hooks/use-backend";

// Types for Gmail integration
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  sizeEstimate: number;
  subject: string;
  from: string;
  to: string | string[];
  cc?: string | string[];
  date: string;
  body: string;
  format: string;
  isRead: boolean;
}

interface GmailListResponse {
  messages: GmailMessage[];
  resultSizeEstimate: number;
  nextPageToken?: string;
}

interface GmailSearchResponse extends GmailListResponse {
  query: string;
}

interface GmailSendResponse {
  id: string;
  threadId: string;
  labelIds: string[];
  message: string;
}

export function GmailIntegration() {
  const { callTool } = useBackend();
  
  // State for different operations
  const [messages, setMessages] = React.useState<GmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = React.useState<GmailMessage | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // List state
  const [listLimit, setListLimit] = React.useState(20);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchLimit, setSearchLimit] = React.useState(20);
  
  // Send state
  const [sendTo, setSendTo] = React.useState("");
  const [sendSubject, setSendSubject] = React.useState("");
  const [sendBody, setSendBody] = React.useState("");
  const [sendFormat, setSendFormat] = React.useState<"html" | "text">("text");
  const [isSending, setIsSending] = React.useState(false);
  
  // Read state
  const [readMessageId, setReadMessageId] = React.useState("");
  const [readFormat, setReadFormat] = React.useState<"full" | "minimal" | "raw">("full");
  const [readResult, setReadResult] = React.useState<GmailMessage | null>(null);

  // Utility functions
  const handleError = (error: any) => {
    const message = error?.message || error?.toString() || "An unknown error occurred";
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const clearError = () => setError(null);

  // Gmail operations
  const handleListMessages = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await callTool("list_email", {
        limit: listLimit,
        unreadOnly
      });
      
      if (result && result.content && Array.isArray(result.content)) {
        const firstContent = result.content[0];
        if (firstContent && "data" in firstContent && firstContent.data) {
          const data = firstContent.data as any;
          if (data.messages) {
            setMessages(data.messages);
            setSelectedMessage(null);
          }
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchMessages = async () => {
    if (!searchQuery.trim()) {
      setError("Search query is required");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await callTool("search_email", {
        query: searchQuery,
        limit: searchLimit
      });
      
      if (result && result.content && Array.isArray(result.content)) {
        const firstContent = result.content[0];
        if (firstContent && "data" in firstContent && firstContent.data) {
          const data = firstContent.data as any;
          if (data.messages) {
            setMessages(data.messages);
            setSelectedMessage(null);
          }
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadMessage = async () => {
    if (!readMessageId.trim()) {
      setError("Message ID is required");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await callTool("read_email", {
        messageId: readMessageId,
        format: readFormat
      });
      
      if (result && result.content && Array.isArray(result.content)) {
        const firstContent = result.content[0];
        if (firstContent && "data" in firstContent && firstContent.data) {
          setReadResult(firstContent.data as any);
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sendTo.trim() || !sendSubject.trim() || !sendBody.trim()) {
      setError("To, subject, and body are required");
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    try {
      const result = await callTool("send_email", {
        to: sendTo.split(",").map(email => email.trim()),
        subject: sendSubject,
        body: sendBody,
        format: sendFormat
      });
      
      if (result && result.content && Array.isArray(result.content)) {
        const firstContent = result.content[0];
        if (firstContent && "data" in firstContent && firstContent.data) {
          const data = firstContent.data as any;
          if (data.id) {
            // Clear form
            setSendTo("");
            setSendSubject("");
            setSendBody("");
            setError(null);
            
            // Show success message
            setError("✅ Email sent successfully!");
            setTimeout(() => setError(null), 3000);
          }
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(parseInt(dateString)).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Gmail Integration
          </h1>
          <p className="text-muted-foreground">
            Connect to your Gmail account via MCP backend
          </p>
        </div>
        <Button 
          onClick={handleListMessages} 
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">{error}</span>
          <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
            ×
          </Button>
        </div>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">List Messages</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="read">Read Message</TabsTrigger>
          <TabsTrigger value="send">Send Email</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>List Gmail Messages</CardTitle>
              <CardDescription>
                Fetch messages from your Gmail inbox with optional filtering
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="list-limit">Limit</Label>
                  <Input
                    id="list-limit"
                    type="number"
                    min="1"
                    max="100"
                    value={listLimit}
                    onChange={(e) => setListLimit(parseInt(e.target.value) || 20)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unread-only">Unread Only</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="unread-only"
                      type="checkbox"
                      checked={unreadOnly}
                      onChange={(e) => setUnreadOnly(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="unread-only">Show only unread messages</Label>
                  </div>
                </div>
              </div>
              <Button onClick={handleListMessages} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                List Messages
              </Button>
            </div>
          </Card>

          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Messages ({messages.length})</CardTitle>
              </CardHeader>
              <div>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedMessage?.id === message.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm truncate">
                                {message.subject || "(No Subject)"}
                              </span>
                              {!message.isRead && (
                                <Badge variant="secondary" className="text-xs">
                                  Unread
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mb-1">
                              From: {message.from}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {formatDate(message.internalDate)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {truncateText(message.snippet || message.body, 150)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </Card>
          )}

          {selectedMessage && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Message</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Subject:</span> {selectedMessage.subject || "(No Subject)"}
                  </div>
                  <div>
                    <span className="font-semibold">From:</span> {selectedMessage.from}
                  </div>
                  <div>
                    <span className="font-semibold">To:</span> {Array.isArray(selectedMessage.to) ? selectedMessage.to.join(", ") : selectedMessage.to}
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span> {formatDate(selectedMessage.internalDate)}
                  </div>
                  {selectedMessage.cc && (
                    <div>
                      <span className="font-semibold">CC:</span> {Array.isArray(selectedMessage.cc) ? selectedMessage.cc.join(", ") : selectedMessage.cc}
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <span className="font-semibold">Body:</span>
                  <div className="mt-2 p-3 bg-muted rounded-lg max-h-64 overflow-y-auto">
                    {selectedMessage.format === "html" ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedMessage.body }} />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">{selectedMessage.body}</pre>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Gmail Messages</CardTitle>
              <CardDescription>
                Search for specific messages using Gmail search operators
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Search Query</Label>
                <Input
                  id="search-query"
                  placeholder="e.g., from:example@gmail.com subject:meeting is:important"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use Gmail search operators like: from:, to:, subject:, is:important, is:unread, etc.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-limit">Limit</Label>
                  <Input
                    id="search-limit"
                    type="number"
                    min="1"
                    max="100"
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(parseInt(e.target.value) || 20)}
                  />
                </div>
              </div>
              <Button onClick={handleSearchMessages} disabled={isLoading || !searchQuery.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Search Messages
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="read" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Read Gmail Message</CardTitle>
              <CardDescription>
                Fetch a specific message by ID
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="read-message-id">Message ID</Label>
                  <Input
                    id="read-message-id"
                    placeholder="Enter Gmail message ID"
                    value={readMessageId}
                    onChange={(e) => setReadMessageId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="read-format">Format</Label>
                  <select
                    id="read-format"
                    value={readFormat}
                    onChange={(e) => setReadFormat(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="full">Full</option>
                    <option value="minimal">Minimal</option>
                    <option value="raw">Raw</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleReadMessage} disabled={isLoading || !readMessageId.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Read Message
              </Button>
            </div>
          </Card>

          {readResult && (
            <Card>
              <CardHeader>
                <CardTitle>Message Content</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Subject:</span> {readResult.subject || "(No Subject)"}
                  </div>
                  <div>
                    <span className="font-semibold">From:</span> {readResult.from}
                  </div>
                  <div>
                    <span className="font-semibold">To:</span> {Array.isArray(readResult.to) ? readResult.to.join(", ") : readResult.to}
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span> {formatDate(readResult.internalDate)}
                  </div>
                </div>
                <Separator />
                <div>
                  <span className="font-semibold">Body:</span>
                  <div className="mt-2 p-3 bg-muted rounded-lg max-h-96 overflow-y-auto">
                    {readResult.format === "html" ? (
                      <div dangerouslySetInnerHTML={{ __html: readResult.body }} />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">{readResult.body}</pre>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Email</CardTitle>
              <CardDescription>
                Compose and send a new email via Gmail
              </CardDescription>
            </CardHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="send-to">To (comma-separated)</Label>
                <Input
                  id="send-to"
                  placeholder="recipient@example.com, another@example.com"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-subject">Subject</Label>
                <Input
                  id="send-subject"
                  placeholder="Email subject"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-body">Body</Label>
                <Textarea
                  id="send-body"
                  placeholder="Email body content"
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  rows={8}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="send-format">Format</Label>
                  <select
                    id="send-format"
                    value={sendFormat}
                    onChange={(e) => setSendFormat(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="text">Plain Text</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
              </div>
              <Button 
                onClick={handleSendMessage} 
                disabled={isSending || !sendTo.trim() || !sendSubject.trim() || !sendBody.trim()}
                className="w-full"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Email
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 