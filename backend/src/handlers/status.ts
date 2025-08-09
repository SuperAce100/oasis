import { JSONSchemaType } from 'ajv';
import { validateOrThrow } from '../utils/ajv.js';
import { jobRegistry } from '../utils/jobs.js';
import { NOT_FOUND } from '../utils/errors.js';

export interface StatusGetJobArgs {
  jobId: string;
}

const statusGetJobSchema: JSONSchemaType<StatusGetJobArgs> = {
  type: 'object',
  properties: {
    jobId: { type: 'string', minLength: 1 },
  },
  required: ['jobId'],
  additionalProperties: false,
};

export async function handleStatusGetJob(
  args: unknown,
  context: { traceId: string }
): Promise<{ content: Array<{ type: string; text?: string; data?: any }> }> {
  const validatedArgs = validateOrThrow(
    statusGetJobSchema,
    args,
    'status.get_job@v1'
  );

  const job = jobRegistry.get(validatedArgs.jobId);
  
  if (!job) {
    throw NOT_FOUND(`Job ${validatedArgs.jobId} not found`);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Job ${validatedArgs.jobId} is ${job.status}`,
      },
      {
        type: 'json',
        data: job,
      },
    ],
  };
}

export interface StatusListJobsArgs {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  limit?: number;
}

const statusListJobsSchema: JSONSchemaType<StatusListJobsArgs> = {
  type: 'object',
  properties: {
    status: { 
      type: 'string', 
      enum: ['pending', 'running', 'completed', 'failed'], 
      nullable: true 
    },
    limit: { type: 'number', minimum: 1, maximum: 100, nullable: true },
  },
  required: [],
  additionalProperties: false,
};

export async function handleStatusListJobs(
  args: unknown,
  context: { traceId: string }
): Promise<{ content: Array<{ type: string; text?: string; data?: any }> }> {
  const validatedArgs = validateOrThrow(
    statusListJobsSchema,
    args,
    'status.list_jobs@v1'
  );

  let jobs = jobRegistry.getAllJobs();
  
  // Filter by status if specified
  if (validatedArgs.status) {
    jobs = jobs.filter(job => job.status === validatedArgs.status);
  }
  
  // Sort by updatedAt descending (most recent first)
  jobs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  
  // Apply limit
  const limit = validatedArgs.limit || 20;
  jobs = jobs.slice(0, limit);

  return {
    content: [
      {
        type: 'text',
        text: `Found ${jobs.length} job(s)`,
      },
      {
        type: 'json',
        data: {
          jobs,
          total: jobs.length,
          filtered: !!validatedArgs.status,
        },
      },
    ],
  };
}