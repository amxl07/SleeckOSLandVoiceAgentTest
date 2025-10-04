import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Volume2 } from 'lucide-react';
import { trackEvent } from '@/utils/tracking';

const voiceTranscript = `
Agent: "Hi there! I'm calling about your recent inquiry on our website. Is this a good time to chat for just 2 minutes?"

Lead: "Sure, I guess so."

Agent: "Perfect! I see you were looking into automation solutions. What's your biggest challenge with manual processes right now?"

Lead: "We're spending way too much time following up with leads manually."

Agent: "I totally understand that pain. On average, how many leads are you handling per week?"

Lead: "About 100, and we're only converting maybe 15% of them."

Agent: "That's actually pretty typical. Our AI system has helped similar businesses boost that to 40-50% conversion rates. Would you like to see exactly how we could do that for your business?"
`;

export default function VoiceDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(42); // 42 seconds
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      // In real implementation, pause actual audio
      trackEvent('voice_demo_paused', { progress: (currentTime / duration) * 100 });
    } else {
      setIsPlaying(true);
      // In real implementation, play actual audio
      trackEvent('voice_demo_played');
      
      // Simulate audio progress
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            clearInterval(interval);
            trackEvent('voice_demo_completed');
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / duration) * 100;

  return null;
}