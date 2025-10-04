import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, MessageSquare, X } from 'lucide-react';
import { trackFormSubmit } from '@/utils/tracking';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'call' | 'demo';
}

export default function BookingModal({ isOpen, onClose, type }: BookingModalProps) {
  const [step, setStep] = useState<'calendly' | 'form'>('calendly');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    note: '',
    preferWhatsApp: false
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackFormSubmit(type === 'call' ? 'booking_call' : 'booking_demo');
    console.log('Form submitted:', formData);
    
    // TODO: Integrate with actual form handler
    // Example webhook payload for n8n:
    /*
    {
      "type": "booking_request",
      "lead_type": type,
      "contact": {
        "name": formData.name,
        "email": formData.email,
        "phone": formData.phone,
        "company": formData.company,
        "note": formData.note,
        "prefers_whatsapp": formData.preferWhatsApp
      },
      "source": "landing_page",
      "timestamp": new Date().toISOString()
    }
    */
    
    onClose();
  };

  const title = type === 'call' ? 'Book Your Free Discovery Call' : 'Book Your Live Demo';
  const description = type === 'call' 
    ? 'Choose a time that works for you - no obligation, just value.'
    : 'See our AI automation in action with a personalized demo.';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        {step === 'calendly' ? (
          <div className="space-y-4">
            <div className="aspect-video bg-card rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center space-y-3">
                <Calendar className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground">Calendly Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Calendar widget would appear here
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setStep('form')}
                className="flex-1"
                data-testid="switch-to-form"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Use Contact Form
              </Button>
              <Button 
                size="sm" 
                onClick={onClose}
                className="flex-1 bg-primary text-primary-foreground"
                data-testid="open-calendly"
              >
                Open Calendar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  data-testid="input-company"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                data-testid="input-phone"
              />
            </div>
            
            <div>
              <Label htmlFor="note">What's your biggest automation challenge?</Label>
              <Textarea
                id="note"
                placeholder="e.g., Too many manual follow-ups, missed leads..."
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                data-testid="textarea-note"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="whatsapp"
                checked={formData.preferWhatsApp}
                onChange={(e) => setFormData(prev => ({ ...prev, preferWhatsApp: e.target.checked }))}
                className="rounded border-border"
                data-testid="checkbox-whatsapp"
              />
              <Label htmlFor="whatsapp" className="text-sm">
                I prefer WhatsApp for quick updates
              </Label>
            </div>
            
            <div className="flex space-x-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('calendly')}
                className="flex-1"
              >
                Back to Calendar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary text-primary-foreground"
                data-testid="submit-booking-form"
              >
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}