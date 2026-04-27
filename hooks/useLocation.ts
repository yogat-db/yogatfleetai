'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface Location {
  lat: number
  lng: number
  accuracy?: number
  timestamp?: number
}

interface LocationState {
  location: Location | null
  loading: boolean
  error: string | null
  permissionStatus: PermissionState | 'loading' | null
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds timeout
  maximumAge: 60000, // Cache for 1 minute
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
    permissionStatus: 'loading',
  });

  const watchId = useRef<number | null>(null);

  // 1. Check Permission Status (Great for showing "Please enable GPS" UI)
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setState(prev => ({ ...prev, permissionStatus: status.state }));
          status.onchange = () => {
            setState(prev => ({ ...prev, permissionStatus: status.state }));
          };
        });
    }
  }, []);

  // 2. Clear watch on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  // 3. The Actual Logic
  const getLocation = useCallback(async (
    options: PositionOptions = DEFAULT_OPTIONS,
    watch: boolean = false
  ) => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        },
        loading: false,
        error: null,
        permissionStatus: 'granted',
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let message = 'An unknown error occurred';
      switch (error.code) {
        case error.PERMISSION_DENIED: message = 'Permission denied'; break;
        case error.POSITION_UNAVAILABLE: message = 'Location unavailable'; break;
        case error.TIMEOUT: message = 'Location request timed out'; break;
      }
      setState(prev => ({ ...prev, location: null, loading: false, error: message }));
    };

    if (watch) {
      // Useful for tracking a mechanic arriving at a job
      watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
    }
  }, []);

  return { ...state, getLocation };
}