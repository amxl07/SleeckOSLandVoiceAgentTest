# AI Automation Landing Page

A production-ready Next.js landing page that clones the look & feel of Odivend.com while optimizing for conversion and performance.

## Features

- **Modern Dark Theme**: Near-pitch-black background (#050507) with vivid cyan accents (#00E5FF)
- **Responsive Design**: Mobile-first approach with seamless desktop experience
- **Conversion Optimized**: Strategic CTA placement and user flow
- **Performance Focused**: Lazy loading, optimized fonts, minimal animations
- **SEO Ready**: Meta tags, Open Graph, and semantic HTML
- **Analytics Ready**: Placeholder integrations for Google Analytics and Meta Pixel

## Tech Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Fonts**: Poppins (headings) + Inter (body)
- **Icons**: Lucide React
- **Components**: Shadcn/ui

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5000` to see the landing page.

## Page Sections

1. **Header** - Sticky navigation with transparent-to-dark transition
2. **Hero** - Bold headline with primary/secondary CTAs
3. **Video** - YouTube embed with lazy loading
4. **Services** - Three-card layout (Chatbots, Voice Agents, Lead Campaigns)
5. **Process** - Three-step workflow explanation
6. **Testimonials** - Social proof and trust indicators
7. **Footer** - Contact links and final CTA

## Configuration

### Replace Placeholder URLs

Update these placeholders in the components:

- **Calendly URLs**: Replace `https://calendly.com/your-company/15min` with your actual booking links
- **WhatsApp**: Update WhatsApp number in Footer component
- **Email**: Replace `hello@yourbrand.com` with your contact email

### Analytics Setup

Uncomment and configure in `client/index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>

<!-- Meta Pixel -->
<script>fbq('init', 'YOUR_PIXEL_ID');</script>
```

### Brand Customization

- Update "YourBrand" in Header component
- Replace placeholder content in Hero section
- Customize service descriptions in Services component

## Deployment

Ready for deployment to Vercel, Netlify, or any static hosting platform:

```bash
npm run build
```

## Performance Features

- Lazy-loaded YouTube embed
- Optimized Google Fonts loading
- Minimal JavaScript bundle
- Efficient CSS with Tailwind
- Lighthouse-friendly structure

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- High contrast colors (WCAG AA compliant)
- Screen reader friendly
- Focus indicators on interactive elements

## License

MIT