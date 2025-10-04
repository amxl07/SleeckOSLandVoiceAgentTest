// Advanced analytics and conversion tracking
export interface ConversionEvent {
  event: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
  items?: any[];
}

export const trackConversion = (event: ConversionEvent) => {
  console.log('🎯 Conversion tracked:', event);
  
  // Google Analytics 4 Enhanced Ecommerce
  // if (typeof gtag !== 'undefined') {
  //   gtag('event', event.event, {
  //     value: event.value,
  //     currency: event.currency || 'USD',
  //     transaction_id: event.transaction_id,
  //     items: event.items
  //   });
  // }
  
  // Meta Pixel Conversion API
  // if (typeof fbq !== 'undefined') {
  //   fbq('track', event.event, {
  //     value: event.value,
  //     currency: event.currency || 'USD'
  //   });
  // }
  
  // Send to webhook for server-side tracking
  // fetch('/api/track-conversion', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     ...event,
  //     timestamp: new Date().toISOString(),
  //     user_agent: navigator.userAgent,
  //     referrer: document.referrer,
  //     url: window.location.href
  //   })
  // });
};

export const trackBookingAttempt = (type: 'call' | 'demo', source: string) => {
  trackConversion({
    event: 'begin_checkout',
    value: type === 'demo' ? 500 : 250, // Estimated lead value
    currency: 'USD',
    items: [{
      item_id: `booking_${type}`,
      item_name: `${type.charAt(0).toUpperCase() + type.slice(1)} Booking`,
      category: 'Lead Generation',
      quantity: 1,
      price: type === 'demo' ? 500 : 250
    }]
  });
};

export const trackBookingComplete = (type: 'call' | 'demo', leadData: any) => {
  const transactionId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  trackConversion({
    event: 'purchase',
    value: type === 'demo' ? 500 : 250,
    currency: 'USD',
    transaction_id: transactionId,
    items: [{
      item_id: `booking_${type}`,
      item_name: `${type.charAt(0).toUpperCase() + type.slice(1)} Booking`,
      category: 'Lead Generation',
      quantity: 1,
      price: type === 'demo' ? 500 : 250
    }]
  });
  
  // Send lead data to CRM/webhook
  // TODO: Replace with actual webhook URL
  console.log('📝 Lead data for CRM:', {
    transaction_id: transactionId,
    type,
    ...leadData,
    timestamp: new Date().toISOString()
  });
};

// A/B Test tracking
export const trackABTest = (testName: string, variant: string) => {
  console.log(`🧪 A/B Test: ${testName} - Variant: ${variant}`);
  
  // Store in localStorage for consistency
  localStorage.setItem(`ab_test_${testName}`, variant);
  
  // Track with analytics
  // if (typeof gtag !== 'undefined') {
  //   gtag('event', 'ab_test_impression', {
  //     test_name: testName,
  //     variant: variant
  //   });
  // }
};

// Heatmap and user session tracking
export const initializeHeatmaps = () => {
  // Hotjar initialization
  // (function(h,o,t,j,a,r){
  //   h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
  //   h._hjSettings={hjid:YOUR_HOTJAR_ID,hjsv:6};
  //   a=o.getElementsByTagName('head')[0];
  //   r=o.createElement('script');r.async=1;
  //   r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
  //   a.appendChild(r);
  // })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  
  console.log('🔥 Heatmap tracking initialized');
};