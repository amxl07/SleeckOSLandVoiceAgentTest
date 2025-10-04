// Advanced personalization and A/B testing utilities
export interface VisitorContext {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  geo?: string;
  device?: 'mobile' | 'desktop';
  isReturning?: boolean;
}

export const getVisitorContext = (): VisitorContext => {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const context: VisitorContext = {
    utm_source: urlParams.get('utm_source') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    isReturning: localStorage.getItem('returning_visitor') === 'true'
  };

  // Mark as returning visitor
  localStorage.setItem('returning_visitor', 'true');
  
  return context;
};

export const getHeroVariant = (context: VisitorContext): 'trust' | 'problem' | 'social' => {
  // Personalize hero based on traffic source
  if (context.utm_source === 'facebook' || context.utm_source === 'instagram') {
    return 'social'; // Social proof first for social traffic
  }
  if (context.utm_campaign?.includes('problem') || context.utm_medium === 'cpc') {
    return 'problem'; // Problem-first for paid search
  }
  if (context.isReturning) {
    return 'trust'; // Trust-first for returning visitors
  }
  return 'trust'; // Default
};

export const getRecommendedService = (context: VisitorContext): string | null => {
  if (context.utm_campaign?.includes('whatsapp') || context.utm_campaign?.includes('chatbot')) {
    return 'chatbots';
  }
  if (context.utm_campaign?.includes('voice') || context.utm_campaign?.includes('calls')) {
    return 'voice-agents';
  }
  if (context.utm_campaign?.includes('leads') || context.utm_campaign?.includes('funnel')) {
    return 'lead-campaigns';
  }
  return null;
};

export const heroVariants = {
  trust: {
    headline: "Don't hire more. Automate better. With AI.",
    subheadline: "Join 500+ growing businesses using our AI automation to save 15+ hours weekly and increase conversions by 40%.",
    primaryCTA: "Get Free Automation Audit",
    secondaryCTA: "Watch 90-Second Demo"
  },
  problem: {
    headline: "Still manually following up with every lead?",
    subheadline: "Stop losing 60% of your leads to slow response times. Our AI responds in seconds, qualifies instantly, and books meetings 24/7.",
    primaryCTA: "Fix My Lead Response",
    secondaryCTA: "See How It Works"
  },
  social: {
    headline: "How we helped 200+ agencies automate their client acquisition",
    subheadline: "\"Our lead-to-booking rate went from 12% to 47% in 30 days. The AI handles everything while we focus on delivery.\" - Sarah Chen, Agency Owner",
    primaryCTA: "Get The Same Results",
    secondaryCTA: "Watch Success Story"
  }
};