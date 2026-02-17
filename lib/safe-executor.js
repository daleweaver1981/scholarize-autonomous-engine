class SafeExecutor {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  async execute(taskName, fn, options = {}) {
    if (this.dryRun) {
      console.log(`[DRY RUN] Would execute: ${taskName}`);
      return { dryRun: true, task: taskName };
    }

    const retries = options.retries || this.maxRetries;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt}/${retries} failed:`, error.message);

        if (attempt < retries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SafeExecutor;
