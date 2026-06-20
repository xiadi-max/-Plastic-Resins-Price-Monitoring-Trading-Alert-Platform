'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface AlertRecord {
  id: string;
  alert_type: 'general' | 'urgent';
  title: string;
  message: string | null;
  created_at: string;
}

interface AppSettings {
  is_alert_enabled: boolean;
  alert_sound: string;
  is_desktop_notification: boolean;
  is_quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

function parseTimeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + (minute || 0);
}

function isInQuietHours(settings: AppSettings, now = new Date()): boolean {
  if (!settings.is_quiet_hours_enabled) {
    return false;
  }

  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(settings.quiet_hours_start);
  const end = parseTimeToMinutes(settings.quiet_hours_end);

  if (start === end) {
    return false;
  }

  if (start > end) {
    return current >= start || current < end;
  }

  return current >= start && current < end;
}

function playAlertSound(soundType: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.connect(gain);
  gain.connect(context.destination);

  const presets: Record<string, { frequency: number; duration: number; repeats: number }> = {
    wechat: { frequency: 880, duration: 0.12, repeats: 2 },
    ding: { frequency: 660, duration: 0.1, repeats: 3 },
    alert: { frequency: 980, duration: 0.18, repeats: 4 },
    soft: { frequency: 520, duration: 0.2, repeats: 1 },
  };

  const preset = presets[soundType] || presets.wechat;
  let elapsed = 0;

  for (let i = 0; i < preset.repeats; i += 1) {
    const startAt = context.currentTime + elapsed;
    const osc = context.createOscillator();
    const localGain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = preset.frequency + i * 40;
    localGain.gain.value = 0.08;
    osc.connect(localGain);
    localGain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + preset.duration);
    elapsed += preset.duration + 0.08;
  }

  oscillator.disconnect();
  gain.disconnect();

  window.setTimeout(() => {
    void context.close();
  }, Math.ceil(elapsed * 1000) + 200);
}

async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

export function AlertNotifier() {
  const seenAlertIdsRef = useRef<Set<string>>(new Set());
  const settingsRef = useRef<AppSettings | null>(null);
  const bootstrappedRef = useRef(false);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (result.success) {
        settingsRef.current = result.data;
      }
    } catch (error) {
      console.error('加载提醒设置失败:', error);
    }
  }, []);

  const handleAlerts = useCallback(async (alerts: AlertRecord[]) => {
    const settings = settingsRef.current;
    if (!settings?.is_alert_enabled || isInQuietHours(settings)) {
      return;
    }

    const unseen = alerts.filter((alert) => !seenAlertIdsRef.current.has(alert.id));
    if (unseen.length === 0) {
      return;
    }

    unseen.forEach((alert) => seenAlertIdsRef.current.add(alert.id));

    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      return;
    }

    for (const alert of unseen) {
      if (alert.alert_type === 'urgent') {
        toast.error(alert.title, {
          description: alert.message || undefined,
          duration: 8000,
        });

        playAlertSound(settings.alert_sound);

        if (settings.is_desktop_notification && Notification.permission === 'granted') {
          new Notification(alert.title, {
            body: alert.message || '价格发生紧急变动',
            tag: alert.id,
          });
        }
      } else {
        toast.info(alert.title, {
          description: alert.message || undefined,
          duration: 5000,
        });
      }
    }
  }, []);

  const pollAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/alert-history?unread=true');
      const result = await response.json();
      if (result.success) {
        await handleAlerts(result.data || []);
      }
    } catch (error) {
      console.error('轮询提醒失败:', error);
    }
  }, [handleAlerts]);

  useEffect(() => {
    void loadSettings();
    void requestNotificationPermission();

    const settingsInterval = window.setInterval(() => {
      void loadSettings();
    }, 60_000);

    void pollAlerts();
    const pollInterval = window.setInterval(() => {
      void pollAlerts();
    }, 30_000);

    return () => {
      window.clearInterval(settingsInterval);
      window.clearInterval(pollInterval);
    };
  }, [loadSettings, pollAlerts]);

  return null;
}
