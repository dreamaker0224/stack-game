/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface OrientationDropOptions {
  enabled: boolean;
  onDrop: () => void;
}

export function useOrientationDrop({ enabled, onDrop }: OrientationDropOptions) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [currentBeta, setCurrentBeta] = useState<number>(75);
  const [isUpright, setIsUpright] = useState<boolean>(true);
  const [justTriggered, setJustTriggered] = useState<boolean>(false);

  const readyToDropRef = useRef<boolean>(true);
  const lastBetaRef = useRef<number>(75);
  const lastTimeRef = useRef<number>(Date.now());
  const dropCallbackRef = useRef(onDrop);
  dropCallbackRef.current = onDrop;

  // Request sensor permission (mandatory for iOS Safari)
  const requestPermission = useCallback(async () => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientation.requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          return true;
        }
      } catch (err) {
        console.warn('Orientation permission error:', err);
      }
      return false;
    } else {
      // Non-iOS or older devices don't require explicit permission
      setPermissionGranted(true);
      return true;
    }
  }, []);

  // Check if device orientation is supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setIsSupported(true);
    }
  }, []);

  // Listen to deviceorientation events
  useEffect(() => {
    if (!enabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return;

      const beta = e.beta; // front-to-back tilt in degrees (-180 to 180)
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      const prevBeta = lastBetaRef.current;

      setCurrentBeta(Math.round(beta));
      lastBetaRef.current = beta;
      lastTimeRef.current = now;

      // 1. Upright posture detection:
      // When held vertically (roughly 55° ~ 100°): phone is upright, ready to drop on next forward flip!
      if (beta >= 55 && beta <= 110) {
        if (!readyToDropRef.current) {
          readyToDropRef.current = true;
          setIsUpright(true);
        }
      }

      // 2. Forward flip into horizontal detection:
      // "手機垂直變水平，往前翻的時候就墮落"
      // User held it upright (>55°), now tilts forward towards horizontal (beta <= 35°),
      // OR performs a rapid forward flick (deltaBeta < -25° with beta <= 45°):
      const rateOfChange = dt > 0 ? (beta - prevBeta) / dt : 0;
      const isHorizontalForward = beta <= 35 && beta >= -20;
      const isFastForwardFlick = rateOfChange < -70 && beta <= 48;

      if (readyToDropRef.current && (isHorizontalForward || isFastForwardFlick)) {
        readyToDropRef.current = false;
        setIsUpright(false);
        setJustTriggered(true);

        // Haptic feedback if supported
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([35, 20, 35]);
          }
        } catch {
          // ignore
        }

        dropCallbackRef.current();

        setTimeout(() => {
          setJustTriggered(false);
        }, 1200);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [enabled]);

  // Simulate forward flip on desktop
  const simulateForwardFlip = useCallback(() => {
    setJustTriggered(true);
    dropCallbackRef.current();
    setTimeout(() => {
      setJustTriggered(false);
    }, 1200);
  }, []);

  return {
    isSupported,
    permissionGranted,
    currentBeta,
    isUpright,
    justTriggered,
    requestPermission,
    simulateForwardFlip,
  };
}
