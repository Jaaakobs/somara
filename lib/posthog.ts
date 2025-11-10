/**
 * PostHog utility functions for manual event tracking
 * 
 * Usage:
 * import { captureEvent } from '@/lib/posthog'
 * captureEvent('my event', { property: 'value' })
 */

export function captureEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    const posthog = (window as any).posthog
    if (posthog) {
      posthog.capture(eventName, properties)
    } else if (process.env.NODE_ENV === 'development') {
      console.log('PostHog event (not captured):', eventName, properties)
    }
  }
}

export function identify(userId: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    const posthog = (window as any).posthog
    if (posthog) {
      posthog.identify(userId, properties)
    } else if (process.env.NODE_ENV === 'development') {
      console.log('PostHog identify (not captured):', userId, properties)
    }
  }
}

export function reset() {
  if (typeof window !== 'undefined') {
    const posthog = (window as any).posthog
    if (posthog) {
      posthog.reset()
    }
  }
}

