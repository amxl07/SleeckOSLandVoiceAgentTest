import { Clock, Settings, Rocket } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Clock,
    title: '15-minute discovery call',
    description: 'No pressure. Just a quick call to understand your workflow chaos, goals, and where automation can save you time.'
  },
  {
    number: '02',
    icon: Settings,
    title: 'Pilot setup & integration',
    description: 'We build and integrate your custom automation workflows with your existing tools and processes.'
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Launch & scale with dashboards',
    description: 'Go live with comprehensive dashboards and ongoing support to monitor and optimize your automated systems.'
  }
];

export default function Process() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            From Chaos to Clarity
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Here's exactly what happens when you start with us.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div 
                key={step.number} 
                className="relative text-center group"
                data-testid={`process-step-${step.number}`}
              >
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-1/2 w-full h-0.5 bg-border transform translate-x-8 z-0">
                    <div className="w-1/2 h-full bg-primary"></div>
                  </div>
                )}

                {/* Step content */}
                <div className="relative z-10">
                  {/* Step number */}
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full font-bold text-lg mb-6">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 bg-card border border-border rounded-lg flex items-center justify-center mx-auto mb-6 group-hover:border-primary/50 transition-colors hover-elevate">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-bold text-xl lg:text-2xl text-foreground mb-4">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}