import { toast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  title: string
  description?: string
}

export function useToast() {
  const showToast = (type: ToastType, options: ToastOptions) => {
    switch (type) {
      case 'success':
        toast.success(options.title, { description: options.description })
        break
      case 'error':
        toast.error(options.title, { description: options.description })
        break
      case 'info':
        toast.info(options.title, { description: options.description })
        break
      case 'warning':
        toast.warning(options.title, { description: options.description })
        break
    }
  }

  return {
    success: (options: ToastOptions) => showToast('success', options),
    error: (options: ToastOptions) => showToast('error', options),
    info: (options: ToastOptions) => showToast('info', options),
    warning: (options: ToastOptions) => showToast('warning', options),
  }
}
