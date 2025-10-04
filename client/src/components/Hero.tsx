import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Play, TrendingUp, Users, Zap, Shield } from 'lucide-react';
import BookingModal from '@/components/ui/booking-modal';
import { trackCTAClick } from '@/utils/tracking';
import { getVisitorContext, getHeroVariant, heroVariants } from '@/utils/personalization';
import heroImage from '@assets/generated_images/AI_brain_tech_hero_b6cc6df9.png';

export default function Hero() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'call' | 'demo'>('call');
  const [heroVariant, setHeroVariant] = useState<'trust' | 'problem' | 'social'>('trust');
  const [liveStats, setLiveStats] = useState({
    automationsDeployed: 1247,
    activeConversations: 89,
    leadsCaptured: 12789
  });

  useEffect(() => {
    const context = getVisitorContext();
    const variant = getHeroVariant(context);
    setHeroVariant(variant);

    // Simulate live stats updates
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        automationsDeployed: prev.automationsDeployed + Math.floor(Math.random() * 3),
        activeConversations: Math.max(50, prev.activeConversations + Math.floor(Math.random() * 10 - 5)),
        leadsCaptured: prev.leadsCaptured + Math.floor(Math.random() * 5)
      }));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const currentVariant = heroVariants[heroVariant];

  const handleBookCall = () => {
    trackCTAClick('book_call');
    setBookingType('call');
    setIsBookingOpen(true);
  };

  const handleWatchDemo = () => {
    trackCTAClick('watch_demo');
    const videoSection = document.getElementById('video-section');
    videoSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePlayVideo = () => {
    trackCTAClick('watch_demo');
    setBookingType('demo');
    setIsBookingOpen(true);
  };

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/95"></div>
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50"></div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-primary/60 rounded-full animate-ping"></div>
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-primary/80 rounded-full animate-pulse"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-5xl mx-auto">
            {/* Status Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-primary">
                Live: {liveStats.activeConversations} AI conversations happening now
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-foreground leading-[1.1] mb-6 tracking-tight">
              {currentVariant.headline.split(' ').map((word, index) => {
                if (word.includes('AI') || word.includes('Automate') || word.includes('automate')) {
                  return (
                    <span key={index} className="text-transparent bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text animate-pulse">
                      {word}{' '}
                    </span>
                  );
                }
                return <span key={index}>{word} </span>;
              })}
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
              {currentVariant.subheadline}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg"
                onClick={handleBookCall}
                data-testid="button-book-call-hero"
                className="group bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-2xl hover:shadow-primary/30 px-8 py-6 text-lg font-bold rounded-full transition-all duration-300 hover:scale-105 relative overflow-hidden"
              >
                <Calendar className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                {currentVariant.primaryCTA}
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleWatchDemo}
                data-testid="button-watch-demo-hero"
                className="group px-8 py-6 text-lg font-semibold rounded-full hover-elevate border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              >
                <Play className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                {currentVariant.secondaryCTA}
              </Button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
              <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-4 hover-elevate">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-primary mr-2" />
                  <span className="text-2xl font-bold text-foreground">
                    {liveStats.automationsDeployed.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Automations Deployed</p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-4 hover-elevate">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-primary mr-2" />
                  <span className="text-2xl font-bold text-foreground">47%</span>
                </div>
                <p className="text-sm text-muted-foreground">Avg. Conversion Boost</p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-4 hover-elevate">
                <div className="flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5 text-primary mr-2" />
                  <span className="text-2xl font-bold text-foreground">15h</span>
                </div>
                <p className="text-sm text-muted-foreground">Weekly Time Saved</p>
              </div>
            </div>

            {/* Trust Elements */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-green-500" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>500+ businesses trust us</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  No Setup Fee
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BookingModal 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        type={bookingType}
      />
    </>
  );
}