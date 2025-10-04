import { Button } from '@/components/ui/button';
import { Mail, MessageCircle } from 'lucide-react';
import { trackCTAClick } from '@/utils/tracking';

export default function Footer() {
  const handleBookCall = () => {
    trackCTAClick('book_call');
    // TODO: Replace with actual Calendly URL
    window.open('https://calendly.com/your-company/15min', '_blank');
  };

  const handleWhatsApp = () => {
    // TODO: Replace with actual WhatsApp URL
    window.open('https://wa.me/1234567890', '_blank');
  };

  const handleEmail = () => {
    window.location.href = 'mailto:hello@yourbrand.com';
  };

  return (
    <footer className="bg-background border-t border-border">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Ready to Automate Smarter?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Schedule a Call and Begin Automating
          </p>
          
          <Button 
            size="lg"
            onClick={handleBookCall}
            data-testid="button-book-call-footer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-semibold rounded-full mb-12"
          >
            Book A Free Call
          </Button>

          {/* Contact Options */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-12">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleWhatsApp}
              data-testid="button-whatsapp-footer"
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEmail}
              data-testid="button-email-footer"
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email Us
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground text-sm">
              © 2024 YourBrand. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}