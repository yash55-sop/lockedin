import { toast } from "sonner";

// Observe the real request so async handlers stay pending until it completes.
// Sonner's toast.promise return value is a toast handle, not the request promise.
export async function notifyMutation<T>(
  request: Promise<T>,
  options: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) {
  toast.promise(request, options);
  try {
    return await request;
  } catch {
    return undefined;
  }
}
