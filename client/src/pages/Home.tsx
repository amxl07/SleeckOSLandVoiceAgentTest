import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Video from '@/components/Video';
import LiveVoiceAgentDemo from '@/components/LiveVoiceAgentDemo';
import Services from '@/components/Services';
import Process from '@/components/Process';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import FloatingCTA from '@/components/ui/floating-cta';
import AIChatWidget from '@/components/ai-chat-widget';
import { trackEvent } from '@/utils/tracking';

export default function Home() {
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);

  useEffect(() => {
    // Track page view with UTM parameters
    const urlParams = new URLSearchParams(window.location.search);
    const utm_source = urlParams.get('utm_source');
    const utm_campaign = urlParams.get('utm_campaign');
    
    trackEvent('page_view', {
      utm_source,
      utm_campaign,
      page: 'home',
      timestamp: new Date().toISOString()
    });

    // Show floating CTA after scroll
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setShowFloatingCTA(scrollPercent > 20);
    };

    // Exit intent detection (desktop only)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitIntentShown && window.innerWidth > 768) {
        setExitIntentShown(true);
        trackEvent('exit_intent_detected');
        // Could trigger exit intent modal here
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Performance tracking
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          trackEvent('performance_lcp', { 
            value: entry.startTime,
            good: entry.startTime < 2500 
          });
        }
      });
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      observer.disconnect();
    };
  }, [exitIntentShown]);

  return (
    <div className="min-h-screen bg-background text-foreground dark relative">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "AutomateAI",
            "description": "AI automation solutions for business growth",
            "url": "https://yourdomain.com",
            "logo": "https://yourdomain.com/logo.png",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+1-555-0123",
              "contactType": "customer service"
            },
            "sameAs": [
              "https://linkedin.com/company/your-company",
              "https://twitter.com/your-company"
            ]
          })
        }}
      />

      <Header />
      <main>
        <Hero />
        <Video />
        <section className="py-16 px-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold text-foreground mb-4">
                Experience Our Voice AI
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Book a call using our intelligent voice agent that understands natural speech and guides you through the booking process.
              </p>
            </div>
            <LiveVoiceAgentDemo />
          </div>
        </section>
        <Services />
        <Process />
        <Testimonials />
      </main>
      <Footer />
      
      {/* Advanced UI Components */}
      <FloatingCTA isVisible={showFloatingCTA} />
      <AIChatWidget />
      
      {/* Cookie Consent - GDPR Compliance */}
      {/* <CookieConsent /> - TODO: Implement if needed */}
    </div>
  );
}