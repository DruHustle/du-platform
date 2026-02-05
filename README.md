# ZIGD Gateway Platform

**Zimbabwe Global and Diaspora Gateway** - A unified digital platform connecting Zimbabwe's diaspora with trade, tourism, and investment opportunities.

## Overview

The ZIGD Gateway Platform addresses critical gaps in Zimbabwe's diaspora engagement strategy by providing:

- **Export Knowledge Hub**: Comprehensive guidance on German market requirements, certifications, and partnerships
- **Tourism Information**: Discover Zimbabwe's world-class attractions with diaspora-focused packages
- **Investment Marketplace**: Micro-investment and crowdfunding opportunities with government support
- **Trade Information**: Export development programs and diaspora trade networks

## Features

### 🌍 Export Knowledge Hub
- German market requirements and regulations
- EU import compliance (REACH, CE marking, phytosanitary)
- Certification requirements (organic, fair trade)
- Pricing information for Zimbabwean products
- Potential partners database (retailers, logistics, regulatory)

### ✈️ Tourism Information
- Forbes #1 destination 2025 highlights
- Key attractions (Victoria Falls, Great Zimbabwe, Kariba, Balancing Rocks)
- Planning information (visa, health, safety, payments)
- Diaspora homecoming packages
- Integration with Zimbabwe Tourism Authority

### 💰 Investment Opportunities
- Diaspora-friendly crowdfunding projects
- Share-based investment models
- Government support programs
- Performance tracking dashboards
- National Trusted Investment Registry (NTIR)

### 📦 Trade Information
- Key export sectors (horticulture, leather, arts & crafts, minerals)
- ZimTrade programs (Eagles Nest, Next She Exporter, Shop At Zim)
- Diaspora trade network opportunities
- Essential trade resources

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Routing**: Wouter
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Color Scheme

The platform uses Zimbabwe's national colors:
- **Primary (Dark Green)**: `oklch(0.35 0.08 150)` - Headers, buttons, primary elements
- **Secondary (Gold/Yellow)**: `oklch(0.85 0.15 85)` - Accents, highlights, CTAs
- **Accent (Red)**: `oklch(0.55 0.22 25)` - Borders, special highlights

## Local Development

### Prerequisites
- Node.js 22.x or higher
- pnpm 10.x or higher

### Installation

\`\`\`bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
\`\`\`

The development server will start at `http://localhost:3000`

## Deployment

### Vercel Deployment

1. **Connect GitHub Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository

2. **Configure Build Settings**
   - Framework Preset: Other
   - Build Command: `pnpm build`
   - Output Directory: `dist/public`
   - Install Command: `pnpm install`

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your site

The `vercel.json` configuration file is already included for proper routing and caching.

### Render Deployment

1. **Create New Static Site**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Static Site"
   - Connect your GitHub repository

2. **Configure Build Settings**
   - Build Command: `pnpm install && pnpm build`
   - Publish Directory: `dist/public`

3. **Deploy**
   - Click "Create Static Site"
   - Render will build and deploy automatically

The `render.yaml` configuration file is already included for deployment settings.

### Environment Variables

No environment variables are required for the static frontend deployment.

## Project Structure

\`\`\`
zigd-platform/
├── client/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── Layout.tsx  # Main layout with navigation
│   │   │   └── ErrorBoundary.tsx
│   │   ├── contexts/        # React contexts
│   │   │   └── ThemeContext.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── ExportHub.tsx
│   │   │   ├── Tourism.tsx
│   │   │   ├── Investment.tsx
│   │   │   ├── Trade.tsx
│   │   │   └── NotFound.tsx
│   │   ├── App.tsx         # Main app with routing
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Global styles
│   └── index.html
├── vercel.json             # Vercel configuration
├── render.yaml             # Render configuration
└── package.json
\`\`\`

## Strategic Framework Alignment

The ZIGD Gateway Platform addresses key gaps identified in the Diaspora Unlocked Strategic Framework:

### Trade Gaps Addressed
- ✅ SME visibility and knowledge of international market requirements
- ✅ Structured export pipelines vs informal trade
- ✅ Market access information and buyer connections

### Tourism Gaps Addressed
- ✅ Centralized digital presence
- ✅ Diaspora as cultural ambassadors
- ✅ Coordinated tourism promotion

### Investment Gaps Addressed
- ✅ Transparent, pre-vetted opportunities
- ✅ Trust infrastructure (NTIR)
- ✅ Performance tracking systems
- ✅ Micro to institutional investment options

### Coordination Gaps Addressed
- ✅ Unified digital platform
- ✅ Centralized information hub
- ✅ Integration with ZIDA, ZimTrade, Zimbabwe Tourism

## Partner Integration

The platform integrates with official Zimbabwe government agencies:

- **Zimbabwe Tourism Authority**: [zimbabwetourism.net](https://zimbabwetourism.net/)
- **ZIDA (Zimbabwe Investment and Development Agency)**: [zidainvest.com](https://zidainvest.com/)
- **ZimTrade**: [tradezimbabwe.com](https://tradezimbabwe.com/)

## Contributing

This is a government-aligned platform supporting Vision 2030. For contributions or inquiries, please contact the project maintainers.

## License

MIT License - See LICENSE file for details

## Support

For technical support or questions about the platform, please open an issue on GitHub.

---

**Supporting Zimbabwe's Vision 2030 through Diaspora Engagement**
