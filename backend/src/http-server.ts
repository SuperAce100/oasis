import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { handleGmailList, handleGmailSearch, handleGmailRead, handleGmailSend } from './handlers/gmail.js';
import {
  handleSlackPostMessage,
  handleSlackListConversations,
  handleSlackGetHistory,
  handleSlackOpenConversation,
} from './handlers/slack.js';
import {
  handleFsHealth,
  handleFsRoots,
  handleFsExists,
  handleFsStat,
  handleFsDir,
  handleFsResolve,
  handleFsRead,
  handleFsWrite,
  handleFsMkdir,
  handleFsMove,
  handleFsDelete,
  handleFsFind,
  handleFsComplete,
} from './handlers/fs.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Gmail endpoints
app.post('/gmail/list', async (req: any, res: any) => {
  try {
    const result = await handleGmailList(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('Gmail list error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

app.post('/gmail/search', async (req: any, res: any) => {
  try {
    const result = await handleGmailSearch(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('Gmail search error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

app.post('/gmail/read', async (req: any, res: any) => {
  try {
    const result = await handleGmailRead(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('Gmail read error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

app.post('/gmail/send', async (req: any, res: any) => {
  try {
    const result = await handleGmailSend(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('Gmail send error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Health check
app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Gmail HTTP server running on port ${PORT}`);
  console.log(`📧 Available endpoints:`);
  console.log(`   POST /gmail/list - List Gmail messages`);
  console.log(`   POST /gmail/search - Search Gmail messages`);
  console.log(`   POST /gmail/read - Read a Gmail message`);
  console.log(`   POST /gmail/send - Send a Gmail message`);
  console.log(`   POST /slack/post_message - Post a Slack message`);
  console.log(`   POST /slack/list_conversations - List conversations`);
  console.log(`   POST /slack/get_history - Fetch conversation history`);
  console.log(`   POST /slack/open_conversation - Open a DM/MPIM`);
  console.log(`   GET  /health - Health check`);
}); 

// ==========================================
// Filesystem endpoints (MVP)
// ==========================================

app.get('/fs/health', async (_req: any, res: any) => {
  res.json(await handleFsHealth());
});

app.get('/fs/roots', async (_req: any, res: any) => {
  res.json(await handleFsRoots());
});

app.post('/fs/exists', async (req: any, res: any) => {
  try { res.json(await handleFsExists(req.body)); }
  catch (e) { console.error('fs.exists', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/stat', async (req: any, res: any) => {
  try { res.json(await handleFsStat(req.body)); }
  catch (e) { console.error('fs.stat', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/dir', async (req: any, res: any) => {
  try { res.json(await handleFsDir(req.body)); }
  catch (e) { console.error('fs.dir', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/resolve', async (req: any, res: any) => {
  try { res.json(await handleFsResolve(req.body)); }
  catch (e) { console.error('fs.resolve', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/read', async (req: any, res: any) => {
  try { res.json(await handleFsRead(req.body)); }
  catch (e) { console.error('fs.read', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/write', async (req: any, res: any) => {
  try { res.json(await handleFsWrite(req.body)); }
  catch (e) { console.error('fs.write', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/mkdir', async (req: any, res: any) => {
  try { res.json(await handleFsMkdir(req.body)); }
  catch (e) { console.error('fs.mkdir', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/move', async (req: any, res: any) => {
  try { res.json(await handleFsMove(req.body)); }
  catch (e) { console.error('fs.move', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/delete', async (req: any, res: any) => {
  try { res.json(await handleFsDelete(req.body)); }
  catch (e) { console.error('fs.delete', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/find', async (req: any, res: any) => {
  try { res.json(await handleFsFind(req.body)); }
  catch (e) { console.error('fs.find', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

app.post('/fs/complete', async (req: any, res: any) => {
  try { res.json(await handleFsComplete(req.body)); }
  catch (e) { console.error('fs.complete', e); res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' }); }
});

// ==========================================
// Slack endpoints (MVP)
// ==========================================

app.post('/slack/post_message', async (req: any, res: any) => {
  try {
    const result = await handleSlackPostMessage(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('slack.post_message', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' });
  }
});

app.post('/slack/list_conversations', async (req: any, res: any) => {
  try {
    const result = await handleSlackListConversations(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('slack.list_conversations', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' });
  }
});

app.post('/slack/get_history', async (req: any, res: any) => {
  try {
    const result = await handleSlackGetHistory(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('slack.get_history', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' });
  }
});

app.post('/slack/open_conversation', async (req: any, res: any) => {
  try {
    const result = await handleSlackOpenConversation(req.body, { traceId: 'http' });
    res.json(result);
  } catch (error) {
    console.error('slack.open_conversation', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Bad request' });
  }
});