import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Play } from 'lucide-react';
import BookingModal from '@/components/ui/booking-modal';
import { trackCTAClick } from '@/utils/tracking';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'call' | 'demo'>('call');
  const [availableSlots, setAvailableSlots] = useState(4);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Simulate real-time slot updates
    const interval = setInterval(() => {
      setAvailableSlots(prev => Math.max(1, Math.min(6, prev + (Math.random() > 0.6 ? 1 : -1))));
    }, 45000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const handleBookCall = () => {
    trackCTAClick('book_call');
    setBookingType('call');
    setIsBookingOpen(true);
  };

  const handleBookDemo = () => {
    trackCTAClick('book_demo');
    setBookingType('demo');
    setIsBookingOpen(true);
  };

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-background/95 backdrop-blur-xl border-b border-primary/10 shadow-2xl' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
              </div>
              <h1 className="text-xl font-display font-bold text-foreground tracking-tight">
                Sleeck<span className="text-primary">OS</span>
              </h1>
            </div>

            {/* Social Proof & CTAs */}
            <div className="hidden lg:flex items-center space-x-6">
              {/* Mini social proof */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="flex -space-x-1">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-6 h-6 bg-primary/20 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-primary">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-xs">500+ businesses automated</span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBookDemo}
                data-testid="button-book-demo-header"
                className="hover-elevate group relative overflow-hidden border-primary/20 hover:border-primary/40"
              >
                <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Live Demo
              </Button>
              
              <div className="relative">
                <Button 
                  size="sm"
                  onClick={handleBookCall}
                  data-testid="button-book-call-header"
                  className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 relative overflow-hidden group"
                >
                  <Calendar className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Book Free Audit
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                </Button>
                {availableSlots <= 3 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 animate-pulse">
                    {availableSlots} left
                  </Badge>
                )}
              </div>
            </div>

            {/* Mobile CTAs */}
            <div className="flex lg:hidden items-center space-x-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={handleBookDemo}
                data-testid="button-book-demo-mobile"
                className="px-3"
              >
                <Play className="w-4 h-4" />
              </Button>
              <Button 
                size="sm"
                onClick={handleBookCall}
                data-testid="button-book-call-mobile"
                className="bg-primary text-primary-foreground px-3"
              >
                <Calendar className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <BookingModal 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        type={bookingType}
      />
    </>
  );
}