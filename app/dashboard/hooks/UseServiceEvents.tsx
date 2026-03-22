'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export type ServiceEvent = {
  id: string;
  vehicle_id: string;
  title: string;
  description?: string | null;
  mileage?: number | null;
  date: string;
  cost?: number | null;
  created_at: string;
  updated_at: string;
};

export function useServiceEvent(vehicleId?: string) {
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all service events for a vehicle
  const fetchEvents = useCallback(async (id?: string) => {
    const targetId = id || vehicleId;
    if (!targetId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('service_events')
        .select('*')
        .eq('vehicle_id', targetId)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch service events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  // Add a new service event
  const addEvent = useCallback(async (event: Omit<ServiceEvent, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('service_events')
        .insert([event])
        .select()
        .single();

      if (insertError) throw insertError;
      setEvents(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to add service event');
      throw err;
    }
  }, []);

  // Update an existing service event
  const updateEvent = useCallback(async (id: string, updates: Partial<ServiceEvent>) => {
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('service_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      setEvents(prev => prev.map(e => (e.id === id ? data : e)));
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to update service event');
      throw err;
    }
  }, []);

  // Delete a service event
  const deleteEvent = useCallback(async (id: string) => {
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('service_events')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete service event');
      throw err;
    }
  }, []);

  // Auto-fetch when vehicleId changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
  };
}