import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, Target, CheckCircle, ArrowRight, Zap, Calendar } from 'lucide-react';
import BookingModal from '@/components/ui/booking-modal';
import { trackCTAClick } from '@/utils/tracking';
import { getRecommendedService, getVisitorContext } from '@/utils/personalization';

const services = [
  {
    id: 'chatbots',
    icon: MessageSquare,
    title: 'AI Chatbots',
    description: 'WhatsApp, website and messenger bots that capture & qualify leads 24/7.',
    features: [
      'WhatsApp Business API integration',
      'AI-powered lead qualification',
      'Multi-platform deployment',
      'Real-time analytics dashboard'
    ],
    metrics: { 
      efficiency: '90% faster response',
      conversion: '3.2x lead conversion',
      savings: '$2,400/mo saved'
    },
    color: 'from-blue-500/20 to-primary/20'
  },
  {
    id: 'voice-agents',
    icon: Phone,
    title: 'Voice Agents',
    description: 'Automated calling & IVR agents that reach and qualify leads at scale.',
    features: [
      'Natural conversation AI',
      'Appointment booking automation',
      'CRM integration & sync',
      'Call analytics & transcripts'
    ],
    metrics: { 
      efficiency: '24/7 availability',
      conversion: '47% booking rate',
      savings: '15 hours/week'
    },
    color: 'from-green-500/20 to-primary/20'
  },
  {
    id: 'lead-campaigns',
    icon: Target,
    title: 'Lead Campaign System',
    description: 'End-to-end lead capture, nurture, follow-up & conversion optimization.',
    features: [
      'Multi-channel lead capture',
      'Intelligent follow-up sequences',
      'ROI tracking & attribution',
      'Custom automation workflows'
    ],
    metrics: { 
      efficiency: '10x faster setup',
      conversion: '85% follow-up rate',
      savings: '$8,500/mo ROI'
    },
    color: 'from-purple-500/20 to-primary/20'
  }
];

export default function Services() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [recommendedService, setRecommendedService] = useState<string | null>(null);
  const [activeStats, setActiveStats] = useState({
    deploying: 12,
    active: 1247,
    processing: 89
  });

  useEffect(() => {
    const context = getVisitorContext();
    setRecommendedService(getRecommendedService(context));

    // Simulate live stats
    const interval = setInterval(() => {
      setActiveStats(prev => ({
        deploying: Math.max(5, prev.deploying + Math.floor(Math.random() * 6 - 3)),
        active: prev.active + Math.floor(Math.random() * 3),
        processing: Math.max(50, prev.processing + Math.floor(Math.random() * 10 - 5))
      }));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleBookCall = (serviceId: string) => {
    trackCTAClick('book_call');
    setSelectedService(serviceId);
    setIsBookingOpen(true);
  };

  return (
    <>
      <section className="py-24 bg-gradient-to-b from-background to-muted/10 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-2xl"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              <Zap className="w-4 h-4 mr-2" />
              {activeStats.deploying} automations deploying now
            </Badge>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-6 leading-tight">
              World-class AI automation{' '}
              <span className="text-transparent bg-gradient-to-r from-primary to-primary/70 bg-clip-text">
                that scales with you
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              From initial setup to enterprise-scale deployment. Our AI-powered solutions eliminate manual work, 
              capture more leads, and boost conversions across every touchpoint.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {services.map((service, index) => {
              const IconComponent = service.icon;
              const isRecommended = service.id === recommendedService;
              
              return (
                <Card 
                  key={service.id} 
                  className={`group relative overflow-hidden hover-elevate border-border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 ${
                    isRecommended ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/20' : ''
                  }`}
                  data-testid={`card-service-${service.id}`}
                >
                  {isRecommended && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-primary text-primary-foreground">
                        Recommended
                      </Badge>
                    </div>
                  )}

                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                  <CardHeader className="relative z-10 text-center pb-4">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                        <IconComponent className="w-10 h-10 text-primary" />
                      </div>
                      <div className="absolute -inset-2 bg-primary/20 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-300"></div>
                    </div>
                    <CardTitle className="font-display font-bold text-xl text-foreground">
                      {service.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="relative z-10 space-y-6">
                    <p className="text-muted-foreground text-center leading-relaxed">
                      {service.description}
                    </p>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-1 gap-2 p-4 bg-muted/20 rounded-lg">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-primary">{service.metrics.efficiency}</div>
                        <div className="text-xs text-muted-foreground">Efficiency Gain</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-primary">{service.metrics.conversion}</div>
                        <div className="text-xs text-muted-foreground">Results</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-primary">{service.metrics.savings}</div>
                        <div className="text-xs text-muted-foreground">Value</div>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {service.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-primary mr-3 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      className="w-full group bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                      onClick={() => handleBookCall(service.id)}
                      data-testid={`button-book-call-${service.id}`}
                    >
                      <Calendar className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                      Book Strategy Call
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bottom Stats */}
          <div className="bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border border-primary/20 rounded-2xl p-8 text-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">
                  {activeStats.active.toLocaleString()}+
                </div>
                <div className="text-muted-foreground">Automations Deployed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">47%</div>
                <div className="text-muted-foreground">Average Conversion Boost</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">
                  {activeStats.processing}
                </div>
                <div className="text-muted-foreground">Active Conversations Now</div>
                <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mt-1 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BookingModal 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        type="call"
      />
    </>
  );
}