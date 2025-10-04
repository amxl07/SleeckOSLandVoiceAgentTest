import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Calendar } from 'lucide-react';
import { trackCTAClick } from '@/utils/tracking';

interface FloatingCTAProps {
  isVisible?: boolean;
}

export default function FloatingCTA({ isVisible = true }: FloatingCTAProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [slotsLeft, setSlotsLeft] = useState(3);

  useEffect(() => {
    // Simulate real-time availability updates
    const interval = setInterval(() => {
      setSlotsLeft(prev => Math.max(1, Math.min(5, prev + (Math.random() > 0.7 ? 1 : -1))));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleBookCall = () => {
    trackCTAClick('book_call');
    window.open('https://calendly.com/your-company/15min', '_blank');
  };

  if (!isVisible || isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Button
          size="icon"
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          data-testid="floating-cta-minimized"
        >
          <Calendar className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="bg-card border border-primary/20 rounded-lg p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground font-medium">
              {slotsLeft} slots left this week
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8"
            onClick={() => setIsMinimized(true)}
            data-testid="floating-cta-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Ready to automate your business?
            </h3>
            <p className="text-xs text-muted-foreground">
              Book a free 15-min discovery call
            </p>
          </div>
          
          <Button 
            size="sm"
            onClick={handleBookCall}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="floating-cta-book-call"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Book Free Call
          </Button>
        </div>
      </div>
    </div>
  );
}