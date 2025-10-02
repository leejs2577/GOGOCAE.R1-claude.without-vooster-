# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application created with EasyNext, using the App Router architecture. The project is built with TypeScript, React 19, Tailwind CSS, and shadcn/ui components.

## Development Commands

```bash
# Development server (uses Turbopack)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting (ESLint)
npm run lint
```

## Architecture & Key Patterns

### Component Architecture
- **All components must be client components** - Use `use client` directive at the top of component files
- Components follow a feature-based structure when features exist (see Directory Structure below)
- UI components are pre-built using shadcn/ui in `src/components/ui/`

### Page Components
- All `page.tsx` params props **must use Promise type** (Next.js 15 requirement)
- Example: `async function Page({ params }: { params: Promise<{ id: string }> })`

### State Management
- **React Query** (`@tanstack/react-query`): Server state management
  - QueryClient configured in `src/app/providers.tsx` with 60s staleTime for SSR
  - Separate client instances for server vs browser (see providers.tsx pattern)
- **Zustand**: Lightweight global client state
- **React Hook Form** + **Zod**: Form state and validation

### Providers Setup
The app wraps all content with two providers in `src/app/providers.tsx`:
- `ThemeProvider` (next-themes) for dark mode support
- `QueryClientProvider` for React Query
- Pattern uses server/client split to avoid re-instantiating QueryClient on suspense

### Styling
- **Tailwind CSS** with custom design tokens defined via CSS variables (HSL format)
- **shadcn/ui** components in `src/components/ui/` - to add new components:
  ```bash
  npx shadcn@latest add [component-name]
  ```
- Dark mode enabled via class-based strategy
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes

### TypeScript Configuration
- Path alias `@/*` maps to `src/*`
- Strict mode enabled but with relaxed settings:
  - `strictNullChecks: false`
  - `noImplicitAny: false`
- Target ES2017 with bundler module resolution

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── providers.tsx      # React Query + Theme providers
│   └── page.tsx           # Homepage
├── components/
│   └── ui/                # shadcn-ui components
├── constants/             # Common constants
├── hooks/                 # Common hooks (e.g., use-toast.ts)
├── lib/                   # Utility functions (e.g., utils.ts with cn())
├── remote/                # HTTP client configurations
└── features/              # Feature-based modules
    └── [featureName]/
        ├── components/    # Feature-specific components
        ├── constants/     # Feature-specific constants
        ├── hooks/         # Feature-specific hooks
        ├── lib/           # Feature-specific utilities
        └── api.ts         # API fetch functions
```

## Library Guidelines

**Always prefer these libraries for specific needs:**
- `date-fns` - Date/time operations
- `ts-pattern` - Type-safe branching logic
- `es-toolkit` - Utility functions (lodash alternative)
- `react-use` - Common React hooks
- `lucide-react` - Icons
- `zod` - Schema validation
- `axios` - HTTP requests (version 1.7.9)
- `framer-motion` - Animations

## Code Style & Principles

### Key Principles (from Cursor rules)
1. Simplicity, readability, and maintainability over cleverness
2. Early returns over nested conditionals
3. Descriptive naming (minimize AI-generated comments)
4. Functional and immutable patterns (map/filter/reduce, avoid mutation)
5. Pure functions and composition over inheritance
6. DRY principle

### TypeScript Guidelines
- Use explicit types for function parameters and return values
- Leverage type inference where it improves readability
- Use Zod for runtime validation

### Image Handling
- Use `picsum.photos` for placeholder images
- Next.js Image component configured to allow all remote patterns (`hostname: '**'`)

## Important Configuration Notes

- **ESLint**: Configured to ignore during builds (`ignoreDuringBuilds: true`)
- **Package Manager**: Use `npm` (not yarn/pnpm)
- **Korean Text**: After generating code with Korean text, verify UTF-8 encoding is correct

## EasyNext CLI

This project uses EasyNext CLI for scaffolding integrations:
```bash
# Update EasyNext CLI
npm i -g @easynext/cli@latest

# Available integrations
easynext supabase      # Set up Supabase
easynext auth          # Set up Next-Auth
easynext auth idpw     # ID/PW authentication
easynext auth kakao    # Kakao authentication
easynext gtag          # Google Analytics
easynext clarity       # Microsoft Clarity
easynext channelio     # ChannelIO
easynext sentry        # Sentry
easynext adsense       # Google Adsense
```

## Adding New Features

When creating a new feature:
1. Create directory structure under `src/features/[featureName]/`
2. Use client components (`use client`) for all React components
3. Place API calls in `api.ts` within the feature folder
4. Follow the established patterns in providers.tsx for state management
5. Use shadcn/ui components from `src/components/ui/` - install new ones as needed
