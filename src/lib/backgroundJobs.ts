/**
 * Background job tracking system
 * Allows tracking background jobs/processes and their progress/status
 */

export type BackgroundJob = {
  id: string;
  description: string;
  progress?: number; // 0-100 or undefined for indeterminate
};

class BackgroundJobManager {
  private jobs = new Map<string, BackgroundJob>();
  private listeners = new Set<() => void>();

  /**
   * Start tracking a background job
   * @param id Unique identifier for the job
   * @param description Human-readable description of what the job is doing
   * @param progress Optional progress percentage (0-100)
   */
  startJob(id: string, description: string, progress?: number) {
    this.jobs.set(id, { id, description, progress });
    this.notifyListeners();
  }

  /**
   * Update an existing job's progress/description
   */
  updateJob(id: string, description?: string, progress?: number) {
    const job = this.jobs.get(id);
    if (job) {
      if (description !== undefined) job.description = description;
      if (progress !== undefined) job.progress = progress;
      this.notifyListeners();
    }
  }

  /**
   * End/remove a background job
   */
  endJob(id: string) {
    this.jobs.delete(id);
    this.notifyListeners();
  }

  /**
   * Get all currently running jobs
   */
  getJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Check if any jobs are running
   */
  hasJobs(): boolean {
    return this.jobs.size > 0;
  }

  /**
   * Subscribe to job changes
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const backgroundJobs = new BackgroundJobManager();
