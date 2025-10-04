import { useState } from 'react';
import { Button } from '@/components/ui/button';
import BookingModal from '../ui/booking-modal';

export default function BookingModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'call' | 'demo'>('call');

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-4">
        <Button 
          onClick={() => { setType('call'); setIsOpen(true); }}
          data-testid="open-call-modal"
        >
          Open Call Booking
        </Button>
        <Button 
          onClick={() => { setType('demo'); setIsOpen(true); }}
          data-testid="open-demo-modal"
        >
          Open Demo Booking
        </Button>
      </div>
      
      <BookingModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        type={type}
      />
    </div>
  );
}