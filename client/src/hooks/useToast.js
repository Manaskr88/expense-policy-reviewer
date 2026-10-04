import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  return { toast, show, dismiss }
}
