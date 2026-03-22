'use client'

import { useState, useCallback, useEffect } from 'react'

type NotificationPermission = 'default' | 'granted' | 'denied'

interface UseNotificationReturn {
  permission: NotificationPermission
  supported: boolean
  requestPermission: () => Promise<NotificationPermission>
  sendNotification: (title: string, options?: NotificationOptions) => void
}

export function useNotification(): UseNotificationReturn {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  )

  const supported = typeof window !== 'undefined' && 'Notification' in window

  const requestPermission = useCallback(async () => {
    if (!supported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [supported])

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') {
        console.warn('Notification permission not granted')
        return
      }
      new Notification(title, options)
    },
    [permission]
  )

  return {
    permission,
    supported,
    requestPermission,
    sendNotification,
  }
}