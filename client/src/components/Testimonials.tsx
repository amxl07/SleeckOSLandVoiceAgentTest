import { Card, CardContent } from '@/components/ui/card';
import { Quote } from 'lucide-react';

// TODO: Remove mock data - replace with real testimonials
const testimonials = [
  {
    quote: "You won't lose your job to AI — but to someone who uses it.",
    name: "Jensen Huang",
    title: "NVIDIA CEO",
    company: "NVIDIA"
  },
  {
    quote: "The automation workflows have saved us 15+ hours per week and improved our lead conversion rate by 40%.",
    name: "Sarah Chen",
    title: "Operations Director", 
    company: "TechStart Inc"
  }
];

const trustLogos = [
  "Microsoft", "Google", "Amazon", "Meta", "Shopify"
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Trusted by Industry Leaders
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="hover-elevate border-border"
              data-testid={`testimonial-${index}`}
            >
              <CardContent className="p-8">
                <Quote className="w-8 h-8 text-primary mb-6" />
                <blockquote className="text-lg text-foreground mb-6 leading-relaxed italic">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary font-bold text-lg">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-muted-foreground text-sm">
                      {testimonial.title} • {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Logos */}
        <div className="text-center">
          <p className="text-muted-foreground mb-8">Integrations with industry-leading platforms</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {trustLogos.map((logo, index) => (
              <div 
                key={index} 
                className="text-muted-foreground font-semibold text-lg"
                data-testid={`trust-logo-${index}`}
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}