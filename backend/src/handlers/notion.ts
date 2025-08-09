import { Client } from '@notionhq/client';
import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { UNAUTHORIZED, NOT_FOUND, RATE_LIMIT } from '../utils/errors.js';
import { notionCache } from '../utils/cache.js';
import { emitProgress } from '../utils/logger.js';

export interface NotionGetPageArgs {
  pageId: string;
  includeChildren?: boolean;
}

const notionGetPageSchema: JSONSchemaType<NotionGetPageArgs> = {
  type: 'object',
  properties: {
    pageId: { 
      type: 'string', 
      minLength: 32, 
      maxLength: 36,
      pattern: '^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$'
    },
    includeChildren: { type: 'boolean', nullable: true },
  },
  required: ['pageId'],
  additionalProperties: false,
};

function normalizePageId(pageId: string): string {
  // Remove dashes and ensure it's 32 chars
  const cleaned = pageId.replace(/-/g, '');
  if (cleaned.length === 32) {
    // Add dashes in UUID format
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20, 32)}`;
  }
  return pageId;
}

export async function handleNotionGetPage(
  args: unknown,
  context: { traceId: string },
  notionToken: string
): Promise<{ content: Array<{ type: string; text?: string; data?: any }> }> {
  emitProgress(1, 4, 'validating input');
  
  const validatedArgs = validateOrThrow(
    notionGetPageSchema,
    args,
    'notion.get_page@v1'
  );

  const normalizedPageId = normalizePageId(validatedArgs.pageId);
  const cacheKey = `${normalizedPageId}_${validatedArgs.includeChildren || false}`;

  // Check cache first
  emitProgress(2, 4, 'checking cache');
  const cached = notionCache.get(cacheKey);
  if (cached) {
    return {
      content: [
        {
          type: 'text',
          text: `Retrieved Notion page from cache: ${cached.title || 'Untitled'}`,
        },
        {
          type: 'json',
          data: {
            ...cached,
            fromCache: true,
          },
        },
      ],
    };
  }

  emitProgress(3, 4, 'fetching from Notion API');

  const notion = new Client({
    auth: notionToken,
  });

  try {
    // Fetch the page
    const page = await notion.pages.retrieve({
      page_id: normalizedPageId,
    });

    let children = null;
    if (validatedArgs.includeChildren) {
      try {
        const childrenResponse = await notion.blocks.children.list({
          block_id: normalizedPageId,
        });
        children = childrenResponse.results;
      } catch (childError: any) {
        // Log but don't fail if children can't be fetched
        console.warn(`Failed to fetch children for page ${normalizedPageId}:`, childError.message);
      }
    }

    const result = {
      id: page.id,
      createdTime: (page as any).created_time,
      lastEditedTime: (page as any).last_edited_time,
      createdBy: (page as any).created_by,
      lastEditedBy: (page as any).last_edited_by,
      cover: (page as any).cover,
      icon: (page as any).icon,
      parent: (page as any).parent,
      archived: (page as any).archived,
      properties: (page as any).properties,
      url: (page as any).url,
      publicUrl: (page as any).public_url,
      children: children,
      title: extractTitle((page as any).properties),
    };

    // Cache the result
    notionCache.set(cacheKey, result);

    emitProgress(4, 4, 'page retrieved successfully');

    return {
      content: [
        {
          type: 'text',
          text: `Successfully retrieved Notion page: ${result.title || 'Untitled'}`,
        },
        {
          type: 'json',
          data: {
            ...result,
            fromCache: false,
          },
        },
      ],
    };
  } catch (error: any) {
    if (error.code === 'unauthorized') {
      throw UNAUTHORIZED('Invalid Notion token or insufficient permissions');
    }
    
    if (error.code === 'object_not_found') {
      throw NOT_FOUND(`Notion page ${normalizedPageId} not found or not accessible`);
    }
    
    if (error.code === 'rate_limited') {
      throw RATE_LIMIT('Notion API rate limit exceeded', 60);
    }

    throw error;
  }
}

function extractTitle(properties: any): string | null {
  // Try to find title property (usually the first property that's of type 'title')
  for (const [key, value] of Object.entries(properties)) {
    if (value && typeof value === 'object' && 'type' in value) {
      const prop = value as any;
      if (prop.type === 'title' && prop.title && Array.isArray(prop.title)) {
        return prop.title.map((t: any) => t.plain_text || '').join('');
      }
    }
  }
  return null;
}