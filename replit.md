# AI Automation Landing Page

## Overview

This is a production-ready landing page built with React, TypeScript, and Tailwind CSS that showcases AI automation services. The application features a modern dark theme with cyan accents, designed to convert visitors into leads through strategic CTAs and optimized user flows. The landing page includes sections for hero content, video demonstrations, service offerings, testimonials, and contact forms.

The application is architected as a full-stack solution with a React frontend and Express backend, including features like a live voice agent demo that integrates with OpenAI's API for AI-powered conversations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and component-based development
- **Styling**: Tailwind CSS with custom design tokens for consistent spacing, colors, and typography
- **Component Library**: Shadcn/ui components providing a consistent design system
- **State Management**: React hooks (useState, useEffect) for local component state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **API Design**: RESTful endpoints under `/api` prefix for voice agent and booking functionality
- **Session Management**: In-memory storage for voice agent conversations
- **Development Server**: Custom Vite integration with Express middleware for seamless development experience

### Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL with schema definitions
- **Session Storage**: In-memory Map for temporary voice agent conversation state
- **Schema Management**: Centralized schema definitions in shared directory with Zod validation

### Authentication and Authorization
- **Current State**: Basic user schema defined but not implemented in active components
- **Session Storage**: Placeholder for connect-pg-simple session store integration
- **Future Implementation**: Ready for authentication middleware integration

### Design System
- **Typography**: Poppins for headings (600-800 weight) and Inter for body text (400-500 weight)
- **Color Palette**: Dark theme with near-pitch-black background (#050507), white text, and vivid cyan accents (#00E5FF)
- **Spacing System**: Tailwind units of 4, 8, 16, and 24 for consistent spacing
- **Component Patterns**: Hover effects, elevation shadows, and responsive design patterns

### Performance Optimizations
- **Lazy Loading**: Video embeds and images load on demand
- **Font Optimization**: Google Fonts preconnect and display=swap
- **Bundle Optimization**: Vite's tree-shaking and code splitting
- **SEO Ready**: Meta tags, Open Graph, and semantic HTML structure

### Conversion Features
- **Multi-Modal CTAs**: Book call, book demo, and watch demo actions
- **Voice Agent Demo**: Real-time speech recognition and synthesis with OpenAI integration
- **Analytics Ready**: Event tracking infrastructure with placeholder integrations
- **Personalization**: UTM parameter-based content adaptation and A/B testing framework

## External Dependencies

### Core Frontend Dependencies
- **@radix-ui/react-***: Accessible component primitives for UI elements like dialogs, dropdowns, and form controls
- **@tanstack/react-query**: Server state management and caching for API interactions
- **lucide-react**: Consistent icon library for UI elements
- **class-variance-authority**: Type-safe variant management for component styling
- **clsx** and **tailwind-merge**: Utility libraries for conditional CSS class handling

### Backend Dependencies
- **express**: Web framework for API routes and middleware
- **drizzle-orm**: Type-safe ORM for database operations
- **@neondatabase/serverless**: PostgreSQL database driver optimized for serverless environments
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Development and Build Tools
- **vite**: Build tool and development server with React plugin
- **typescript**: Type checking and enhanced developer experience
- **tailwindcss**: Utility-first CSS framework with custom configuration
- **esbuild**: Fast JavaScript bundler for production builds

### AI and Voice Integration
- **OpenAI API**: Powers the voice agent demo with ChatCompletion endpoints
- **Web Speech API**: Browser-native speech recognition and synthesis (no external dependencies)
- **Webhook Integration**: Placeholder for n8n workflow automation and CRM integration

### Analytics and Tracking
- **Google Analytics**: Placeholder integration for page views and conversion tracking
- **Meta Pixel**: Placeholder for Facebook/Instagram ad conversion tracking
- **Custom Event Tracking**: Infrastructure for webhook-based server-side event tracking

### External Services Integration
- **Calendly**: Booking widget integration for call scheduling
- **WhatsApp Business API**: Contact integration for lead communication
- **CRM Systems**: Placeholder integrations for HubSpot, Pipedrive, and Zoho