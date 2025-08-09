export interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  result?: any;
  error?: string;
  progress?: {
    current: number;
    total: number;
    note?: string;
  };
}

class JobRegistry {
  private jobs = new Map<string, Job>();

  create(id: string): Job {
    const job: Job = {
      id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(id, job);
    return job;
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  setStatus(id: string, status: Job['status']): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      job.updatedAt = new Date();
    }
  }

  setResult(id: string, result: any): void {
    const job = this.jobs.get(id);
    if (job) {
      job.result = result;
      job.status = 'completed';
      job.updatedAt = new Date();
    }
  }

  setError(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.error = error;
      job.status = 'failed';
      job.updatedAt = new Date();
    }
  }

  setProgress(id: string, current: number, total: number, note?: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.progress = { current, total, note };
      job.updatedAt = new Date();
    }
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    for (const [id, job] of this.jobs.entries()) {
      if (now.getTime() - job.updatedAt.getTime() > maxAge) {
        this.jobs.delete(id);
      }
    }
  }
}

export const jobRegistry = new JobRegistry();