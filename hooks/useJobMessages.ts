'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type Message = {
  id: string
  job_id: string
  sender_id: string
  receiver_id: string
  content: string
  read_at: string | null
  created_at: string
  sender?: {
    email: string
  }
}

type UseJobMessagesOptions = {
  jobId: string
  currentUserId: string
  otherUserId: string
  pageSize?: number
}

export function useJobMessages({
  jobId,
  currentUserId,
  otherUserId,
  pageSize = 50,
}: UseJobMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [typing, setTyping] = useState(false)

  const messagesChannel = useRef<RealtimeChannel | null>(null)
  const typingChannel = useRef<RealtimeChannel | null>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    fetchMessages()
    subscribeToMessages()
    subscribeToTyping()

    return () => {
      messagesChannel.current?.unsubscribe()
      typingChannel.current?.unsubscribe()
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
    }
  }, [jobId])

  const fetchMessages = async (beforeId?: string) => {
    try {
      if (!beforeId) setLoading(true)
      else setLoadingMore(true)

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:auth.users!sender_id(email)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(pageSize)

      if (beforeId) {
        query = query.lt('id', beforeId)
      }

      const { data, error } = await query

      if (error) throw error

      // Cast through unknown to bypass type mismatch
      const rawMessages = (data as unknown) as Message[]

      // Create a copy and reverse to get chronological order
      const newMessages = (rawMessages ? [...rawMessages] : []).reverse()

      if (beforeId) {
        setMessages((prev) => [...newMessages, ...prev])
        setHasMore(rawMessages?.length === pageSize)
      } else {
        setMessages(newMessages)
        setHasMore(rawMessages?.length === pageSize)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = useCallback(() => {
    if (hasMore && messages.length > 0 && !loadingMore) {
      fetchMessages(messages[0].id)
    }
  }, [hasMore, messages, loadingMore])

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message
          // Fetch sender email (optional)
          const { data: sender } = await supabase
            .from('auth.users')
            .select('email')
            .eq('id', newMessage.sender_id)
            .single()
          newMessage.sender = sender as { email: string }

          setMessages((prev) => [...prev, newMessage])
        }
      )
      .subscribe()
    messagesChannel.current = channel
  }

  const subscribeToTyping = () => {
    const channel = supabase.channel(`typing:${jobId}`)
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === otherUserId) {
          setTyping(payload.isTyping)
          if (payload.isTyping) {
            if (typingTimeout.current) clearTimeout(typingTimeout.current)
            typingTimeout.current = setTimeout(() => setTyping(false), 3000)
          }
        }
      })
      .subscribe()
    typingChannel.current = channel
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return
    try {
      const { error } = await supabase.from('messages').insert({
        job_id: jobId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: content.trim(),
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
    }
  }

  const sendTyping = useCallback((isTyping: boolean) => {
    const channel = supabase.channel(`typing:${jobId}`)
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping },
    })
  }, [jobId, currentUserId])

  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', messageIds)
        .eq('receiver_id', currentUserId)
    } catch (err) {
      console.error('Failed to mark messages as read', err)
    }
  }, [currentUserId])

  // Auto‑mark messages as read
  useEffect(() => {
    const unreadIds = messages
      .filter((m) => m.receiver_id === currentUserId && !m.read_at)
      .map((m) => m.id)
    if (unreadIds.length > 0) {
      markAsRead(unreadIds)
    }
  }, [messages, currentUserId, markAsRead])

  return {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    typing,
    sendMessage,
    sendTyping,
    loadMore,
  }
}