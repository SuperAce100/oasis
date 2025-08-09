import { Octokit } from '@octokit/rest';
import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { UNAUTHORIZED, BAD_REQUEST, RATE_LIMIT } from '../utils/errors.js';
import { emitProgress } from '../utils/logger.js';

export interface GitHubCreateIssueArgs {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

const githubCreateIssueSchema: JSONSchemaType<GitHubCreateIssueArgs> = {
  type: 'object',
  properties: {
    owner: { type: 'string', minLength: 1 },
    repo: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 256 },
    body: { type: 'string', nullable: true },
    labels: {
      type: 'array',
      items: { type: 'string' },
      nullable: true,
    },
    assignees: {
      type: 'array',
      items: { type: 'string' },
      nullable: true,
    },
  },
  required: ['owner', 'repo', 'title'],
  additionalProperties: false,
};

export async function handleGitHubCreateIssue(
  args: unknown,
  context: { traceId: string },
  githubToken: string
): Promise<{ content: Array<{ type: string; text?: string; data?: any }> }> {
  emitProgress(1, 4, 'validating input');
  
  const validatedArgs = validateOrThrow(
    githubCreateIssueSchema,
    args,
    'github.create_issue@v1'
  );

  emitProgress(2, 4, 'authenticating with GitHub');

  const octokit = new Octokit({
    auth: githubToken,
  });

  try {
    emitProgress(3, 4, 'creating issue');

    const response = await octokit.rest.issues.create({
      owner: validatedArgs.owner,
      repo: validatedArgs.repo,
      title: validatedArgs.title,
      body: validatedArgs.body,
      labels: validatedArgs.labels,
      assignees: validatedArgs.assignees,
    });

    emitProgress(4, 4, 'issue created successfully');

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created GitHub issue #${response.data.number} in ${validatedArgs.owner}/${validatedArgs.repo}`,
        },
        {
          type: 'json',
          data: {
            issueNumber: response.data.number,
            issueId: response.data.id,
            url: response.data.html_url,
            state: response.data.state,
            createdAt: response.data.created_at,
            title: response.data.title,
            body: response.data.body,
            labels: response.data.labels.map(label => 
              typeof label === 'string' ? label : label.name
            ),
            assignees: response.data.assignees?.map(assignee => assignee?.login) || [],
          },
        },
      ],
    };
  } catch (error: any) {
    if (error.status === 401) {
      throw UNAUTHORIZED('Invalid GitHub token or insufficient permissions');
    }
    
    if (error.status === 403) {
      const resetTime = error.response?.headers?.['x-ratelimit-reset'];
      const retryAfter = resetTime 
        ? Math.max(0, parseInt(resetTime) - Math.floor(Date.now() / 1000))
        : 3600;
      throw RATE_LIMIT('GitHub API rate limit exceeded', retryAfter);
    }
    
    if (error.status === 404) {
      throw BAD_REQUEST(`Repository ${validatedArgs.owner}/${validatedArgs.repo} not found or not accessible`);
    }
    
    if (error.status === 422) {
      throw BAD_REQUEST(`Validation failed: ${error.message}`, {
        githubErrors: error.response?.data?.errors || [],
      });
    }

    throw error;
  }
}