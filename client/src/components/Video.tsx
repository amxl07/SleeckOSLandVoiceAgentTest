import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Calendar, Clock, Users, Eye } from 'lucide-react';
import VoiceDemo from '@/components/voice-demo';
import BookingModal from '@/components/ui/booking-modal';
import { trackVideoPlay, trackCTAClick } from '@/utils/tracking';
import videoThumbnail from '@assets/generated_images/AI_demo_video_thumbnail_97ad01e1.png';

export default function Video() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(247);
  const [videoDuration] = useState(127); // 2:07 minutes

  useEffect(() => {
    // Simulate live viewer count updates
    const interval = setInterval(() => {
      setViewerCount(prev => Math.max(200, prev + Math.floor(Math.random() * 20 - 10)));
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleVideoPlay = () => {
    setIsVideoLoaded(true);
    trackVideoPlay('demo-video');
  };

  const handleBookDemo = () => {
    trackCTAClick('book_demo');
    setIsBookingOpen(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <section id="video-section" className="py-24 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-primary/3 rounded-full blur-2xl"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-2">
              <Eye className="w-4 h-4 mr-2" />
              {viewerCount} watching this week
            </Badge>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-6 leading-tight">
              See AI automation in action:{' '}
              <span className="text-transparent bg-gradient-to-r from-primary to-primary/70 bg-clip-text">
                Real results, real revenue
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Watch how our clients transformed their lead generation from manual chaos to automated profit machines
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            {/* Main Video Container */}
            <div className="relative">
              <div className="relative aspect-video bg-gradient-to-br from-card to-card/80 rounded-2xl overflow-hidden shadow-2xl hover-elevate border border-primary/20">
                {!isVideoLoaded ? (
                  <div 
                    className="absolute inset-0 cursor-pointer group"
                    onClick={handleVideoPlay}
                    data-testid="video-thumbnail"
                  >
                    <img 
                      src={videoThumbnail} 
                      alt="AI Automation Demo" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                          <div className="w-24 h-24 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-2xl shadow-primary/50">
                            <Play className="w-10 h-10 text-primary-foreground ml-1" />
                          </div>
                          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                        </div>
                        <div className="text-center">
                          <p className="text-white font-bold text-lg mb-1">
                            Watch Full Case Study
                          </p>
                          <div className="flex items-center justify-center space-x-4 text-sm text-white/80">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDuration(videoDuration)}
                            </span>
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {viewerCount} views
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                    title="AI Automation Demo - Real Client Results"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    data-testid="video-iframe"
                  />
                )}
              </div>
            </div>

            {/* Voice Demo Section */}
            <div className="pt-12">
              <VoiceDemo />
            </div>

            {/* CTA Section */}
            <div className="text-center pt-12">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20">
                <h3 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-4">
                  Ready to get these results for your business?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Book a free strategy session and we'll show you exactly how to implement these automations in your business.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button 
                    size="lg"
                    onClick={handleBookDemo}
                    data-testid="button-book-demo-video"
                    className="group bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-2xl hover:shadow-primary/30 px-8 py-6 text-lg font-bold rounded-full transition-all duration-300 hover:scale-105 relative overflow-hidden"
                  >
                    <Calendar className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                    Book Your Strategy Session
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                  </Button>
                  <div className="text-sm text-muted-foreground flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Free • No obligation • 15 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BookingModal 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        type="demo"
      />
    </>
  );
}