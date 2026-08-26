// Meta Pixel Configuration
export const META_PIXEL_ID = '1680836316346863';

/**
 * Initialize Meta Pixel
 * Call this once when the app loads (usually in the root layout)
 */
export function initMetaPixel() {
  if (typeof window === 'undefined') return;
  
  // Prevent duplicate pixel loading
  if ((window as any).fbq) return;

  (window as any).fbq = (window as any).fbq || function () {
    ((window as any).fbq.q = (window as any).fbq.q || []).push(arguments);
  };

  (window as any).fbq('init', META_PIXEL_ID);
  (window as any).fbq('track', 'PageView');
}

/**
 * Track a Meta Pixel event
 * @param eventName - Name of the event (e.g., 'AddToCart', 'Purchase', 'Contact')
 * @param eventData - Optional event parameters
 */
export function trackPixelEvent(eventName: string, eventData?: Record<string, any>) {
  if (typeof window === 'undefined' || !(window as any).fbq) {
    console.warn('Meta Pixel not initialized');
    return;
  }

  (window as any).fbq('track', eventName, eventData || {});
}

/**
 * Track user signup
 */
export function trackSignup() {
  trackPixelEvent('CompleteRegistration', {
    currency: 'BRL',
  });
}

/**
 * Track login
 */
export function trackLogin() {
  trackPixelEvent('Login');
}

/**
 * Track lot calculation/creation
 */
export function trackLotCreated(lotData?: Record<string, any>) {
  trackPixelEvent('AddToCart', {
    content_name: 'Lot Calculation',
    content_type: 'lot',
    value: lotData?.totalCost || 0,
    currency: 'BRL',
    ...lotData,
  });
}

/**
 * Track plan purchase
 */
export function trackPlanPurchase(planName: string, amount: number) {
  trackPixelEvent('Purchase', {
    content_name: planName,
    content_type: 'subscription',
    value: amount,
    currency: 'BRL',
  });
}

/**
 * Track contact/support
 */
export function trackContact() {
  trackPixelEvent('Contact');
}

/**
 * Track view content (viewing lot details, dashboard, etc)
 */
export function trackViewContent(contentName: string, contentType: string) {
  trackPixelEvent('ViewContent', {
    content_name: contentName,
    content_type: contentType,
  });
}
