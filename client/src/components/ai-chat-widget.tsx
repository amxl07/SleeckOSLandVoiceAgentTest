import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { trackEvent } from '@/utils/tracking';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const predefinedQuestions = [
  "How much does automation cost?",
  "What's included in the free audit?",
  "How long does setup take?",
  "Do you work with my industry?"
];

const botResponses: Record<string, string> = {
  "how much": "Our automation solutions start at $500/month. But every business is different - I'd recommend booking a free 15-minute call where we can give you a custom quote based on your specific needs. Would you like me to book that for you?",
  "cost": "Investment depends on your automation complexity. Most clients see 300%+ ROI within 60 days. Book a free audit to get your custom quote.",
  "audit": "Our free automation audit includes: workflow analysis, lead leakage assessment, ROI projection, and a custom automation roadmap. It takes about 15 minutes and there's zero obligation.",
  "setup": "Most automations go live within 7-14 days. Simple chatbots can be deployed in 2-3 days, while complex multi-channel systems take 2 weeks max.",
  "industry": "We work across industries - agencies, e-commerce, SaaS, coaching, real estate, and more. Each automation is custom-built for your specific business model.",
  "default": "Great question! I'd love to connect you with our automation specialist who can give you a detailed answer. Would you like to book a quick 15-minute call?"
};

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI assistant. I can help answer questions about our automation services and book you a free consultation. What would you like to know?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [leadScore, setLeadScore] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (text: string, sender: 'user' | 'bot') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Increase lead score based on questions
    if (message.includes('price') || message.includes('cost')) setLeadScore(prev => prev + 20);
    if (message.includes('book') || message.includes('call')) setLeadScore(prev => prev + 30);
    if (message.includes('when') || message.includes('how long')) setLeadScore(prev => prev + 15);
    
    for (const [key, response] of Object.entries(botResponses)) {
      if (message.includes(key)) {
        return response;
      }
    }
    return botResponses.default;
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    trackEvent('chat_message', { message_length: inputText.length, lead_score: leadScore });
    
    addMessage(inputText, 'user');
    setInputText('');
    
    // Simulate bot typing delay
    setTimeout(() => {
      const response = getBotResponse(inputText);
      addMessage(response, 'bot');
      
      // If high lead score, offer booking
      if (leadScore >= 40) {
        setTimeout(() => {
          addMessage("You seem really interested! Would you like me to book a free 15-minute call with our automation specialist? Just click the 'Book Call' button below.", 'bot');
        }, 2000);
      }
    }, 1000);
  };

  const handleQuickQuestion = (question: string) => {
    addMessage(question, 'user');
    setTimeout(() => {
      const response = getBotResponse(question);
      addMessage(response, 'bot');
    }, 1000);
  };

  const handleBookCall = () => {
    trackEvent('chat_booking_requested', { lead_score: leadScore });
    window.open('https://calendly.com/your-company/15min', '_blank');
  };

  const toggleChat = () => {
    if (!isOpen) {
      trackEvent('chat_opened');
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 h-96 z-50 shadow-2xl border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">AI Assistant</h3>
                  <p className="text-xs text-muted-foreground">Usually replies instantly</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleChat}
                className="w-8 h-8"
                data-testid="close-chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col h-full p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[80%] ${
                    message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      message.sender === 'user' ? 'bg-primary' : 'bg-muted'
                    }`}>
                      {message.sender === 'user' ? 
                        <User className="w-3 h-3 text-primary-foreground" /> : 
                        <Bot className="w-3 h-3 text-foreground" />
                      }
                    </div>
                    <div className={`rounded-lg p-3 text-sm ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-foreground'
                    }`}>
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Quick Questions */}
            {messages.length === 1 && (
              <div className="p-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                <div className="grid grid-cols-2 gap-1">
                  {predefinedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs h-8 p-1"
                      data-testid={`quick-question-${index}`}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Input */}
            <div className="p-4 border-t border-border">
              {leadScore >= 40 && (
                <Button
                  size="sm"
                  onClick={handleBookCall}
                  className="w-full mb-2 bg-primary text-primary-foreground"
                  data-testid="chat-book-call"
                >
                  Book Free Call
                </Button>
              )}
              <div className="flex space-x-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything..."
                  className="text-sm"
                  data-testid="chat-input"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="w-10 h-10"
                  data-testid="send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Chat Button */}
      <Button
        onClick={toggleChat}
        className={`fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        data-testid="open-chat"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </>
  );
}