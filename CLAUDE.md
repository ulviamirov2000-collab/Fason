# FASON — Project Context

## What is FASON?
FASON is a second-hand clothing marketplace for Azerbaijan. Think Dolap (Turkey) but built for the Azerbaijani market. Sellers list their used clothing, buyers browse and contact sellers via chat.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database + Auth + Storage + Realtime:** Supabase
- **Styling:** Tailwind CSS
- **Deploy:** Vercel

## Design System
- **Aesthetic:** Playful Y2K / vintage feel
- **Colors:**
  - Hot pink: `#FF2D78`
  - Electric yellow: `#FFE600`
  - Mint green: `#00E5CC`
  - Off-white background: `#FAF7F2`
- **Typography:** Space Grotesk (body) + Unbounded (headings) — Google Fonts
- **Style notes:** Chunky borders, slight card rotations, retro badges, fun hover effects

## Languages
- Bilingual: Azerbaijani (AZ) default + Russian (RU)
- Language toggle in navbar
- All content fields have `_az` and `_ru` variants in the database

## Database Schema (Supabase)

### users
| column | type |
|---|---|
| id | uuid |
| email | text |
| phone | text |
| full_name | text |
| avatar_url | text |
| is_seller | boolean |
| created_at | timestamp |

### listings
| column | type |
|---|---|
| id | uuid |
| seller_id | uuid (→ users) |
| title_az | text |
| title_ru | text |
| description_az | text |
| description_ru | text |
| price | numeric |
| category | text |
| size | text |
| brand | text |
| condition | text (new / good / fair) |
| images | text[] |
| status | text (active / sold / archived) |
| views | integer |
| created_at | timestamp |

### orders
| column | type |
|---|---|
| id | uuid |
| listing_id | uuid (→ listings) |
| buyer_id | uuid (→ users) |
| seller_id | uuid (→ users) |
| status | text (pending / confirmed / delivered / cancelled) |
| amount | numeric |
| created_at | timestamp |

### messages
| column | type |
|---|---|
| id | uuid |
| listing_id | uuid (→ listings) |
| sender_id | uuid (→ users) |
| receiver_id | uuid (→ users) |
| text | text |
| is_read | boolean |
| created_at | timestamp |

## Pages

| Route | Description |
|---|---|
| `/` | Homepage — filter bar + masonry listing grid |
| `/listing/[id]` | Listing detail — gallery, info, chat button |
| `/sell` | Multi-step form to create a listing |
| `/profile/[id]` | Seller profile — avatar, stats, active listings |
| `/messages` | Inbox — conversation list + realtime chat |
| `/auth` | Login / Register (phone or email via Supabase Auth) |

## Key Components
- **Navbar:** FASON logo (bold, slightly rotated), search bar, AZ/RU toggle, login button, pink "Sat / Продать" CTA
- **ListingCard:** photo, yellow price badge, brand chip, condition dot, seller avatar
- **FilterBar:** horizontal scroll on mobile, sticky on desktop — filters: category, size, price range, condition
- **ChatWindow:** realtime messages via Supabase Realtime, listing thumbnail pinned at top

## Categories
- Geyim / Одежда
- Ayaqqabı / Обувь
- Aksesuar / Аксессуары
- Çanta / Сумки

## Business Rules
- No payment gateway in MVP — buyers contact sellers via chat, deal offline
- Sellers can mark listings as sold manually
- Row Level Security (RLS) enabled on all Supabase tables
- Images stored in Supabase Storage

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Current Status
- [ ] Project scaffolding
- [ ] Supabase schema migration
- [ ] Homepage with mock data
- [ ] Connect to real Supabase data
- [ ] Auth flow
- [ ] Listing create flow
- [ ] Chat (realtime)
- [ ] Profile page
- [ ] Deploy to Vercel

## Assets

### Logo / Icon
- File: `fasonicon.png`
- Location: `/public/fasonicon.png`
- Usage: Navbar logo + browser favicon + app icon

### Header Logo (transparent)
- File: `fason-logo.png`  
- Location: `/public/fason-logo.png`
- Usage: Hero/header section — transparent background, place on dark or colored background
- Tagline visible in image: "Dolabını Pula Çevir"
```

---

## Faylları hara qoy
```
fason/
└── public/
    ├── fasonicon.png
    └── fason-logo.png
```

`public` folderini `fason` root-unda yarat, hər iki faylı ora at.

---

## Claude Code-a deyəcəyin
```
Use /public/fasonicon.png as the navbar logo and favicon.
Use /public/fason-logo.png in the hero/header section on homepage.
The logo has transparent background so place it on a dark (#1a1040 or similar) hero section.