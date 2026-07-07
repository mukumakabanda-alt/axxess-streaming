type RetryOptions<T> = {
  attempts?: number;
  delayMs?: number;
  shouldRetryResult?: (result: T) => boolean;
};

const TRANSIENT_ERROR_PARTS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "timeout",
  "temporarily unavailable",
  "aborterror",
];

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isTransientError(error: unknown) {
  if (!error) return false;
  const maybeError = error as { message?: string; name?: string; status?: number };
  if (maybeError.status && maybeError.status >= 500) return true;
  const text = `${maybeError.name ?? ""} ${maybeError.message ?? String(error)}`.toLowerCase();
  return TRANSIENT_ERROR_PARTS.some((part) => text.includes(part));
}

export function hasTransientResultError<T extends { error?: unknown }>(result: T) {
  return isTransientError(result.error);
}

export async function retryTransient<T>(
  operation: () => PromiseLike<T>,
  { attempts = 3, delayMs = 350, shouldRetryResult }: RetryOptions<T> = {},
) {
  let lastThrown: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await operation();
      if (!shouldRetryResult?.(result) || attempt === attempts - 1) return result;
    } catch (error) {
      lastThrown = error;
      if (!isTransientError(error) || attempt === attempts - 1) throw error;
    }

    await wait(delayMs * (attempt + 1));
  }

  throw lastThrown;
}