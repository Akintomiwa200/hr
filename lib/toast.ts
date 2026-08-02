import { toast } from "sonner";

export { toast };

export const notify = {
  success(message: string, description?: string) {
    return toast.success(message, description ? { description } : undefined);
  },
  error(message: string, description?: string) {
    return toast.error(message, description ? { description } : undefined);
  },
  info(message: string, description?: string) {
    return toast.info(message, description ? { description } : undefined);
  },
  warning(message: string, description?: string) {
    return toast.warning(message, description ? { description } : undefined);
  },
  loading(message: string) {
    return toast.loading(message);
  },
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) {
    return toast.promise(promise, messages);
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};

export async function readApiError(
  res: Response,
  fallback = "Something went wrong"
): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function handleApiResponse(
  res: Response,
  options: {
    successMessage: string;
    errorFallback?: string;
    onSuccess?: () => void;
  }
): Promise<boolean> {
  if (!res.ok) {
    notify.error(await readApiError(res, options.errorFallback));
    return false;
  }
  notify.success(options.successMessage);
  options.onSuccess?.();
  return true;
}
