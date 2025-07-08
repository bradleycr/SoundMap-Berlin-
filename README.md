# SoundMap - Audio Social Map PWA

An audio-only social sound map for Berlin with a retro 90s arcade aesthetic. Walk around the city with headphones and discover audio clips that auto-play when you enter drop zones.

## Features

- 🎧 **Audio-Only Experience**: No images or video, just pure sound
- 📍 **Location-Based Playback**: Clips auto-play when entering drop zones
- 🎮 **Retro Arcade UI**: 90s Sega/Nintendo inspired design with pixel fonts
- 📱 **PWA Ready**: Installable with offline capabilities
- 🎵 **Queue System**: Multiple clips in same zone play as a queue
- 👍 **Like/Dislike System**: Curate your audio experience
- 🎙️ **Record & Share**: One-tap recording up to 60 seconds

## Tech Stack

- **Frontend**: Next.js 14 + App Router + TypeScript
- **Styling**: Tailwind CSS with custom retro theme
- **Audio**: Howler.js for audio playback
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions)
- **PWA**: next-pwa for service worker and offline cache
- **Database**: PostGIS for geospatial queries

## Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/soundmap-pwa)

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL scripts in the `scripts/` folder:
   - `01-setup-database.sql` - Creates tables and functions
   - `02-seed-berlin-data.sql` - Adds sample Berlin data

### 3. Environment Variables

Add these to your Vercel deployment or `.env.local`:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 4. Local Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage

1. **Start Walk**: Begin your audio journey with location tracking
2. **Record**: One-tap recording of audio clips (≤60s, AAC, ≤2MB)
3. **Discover**: Walk around Berlin and clips auto-play in drop zones
4. **Curate**: Like/dislike clips to personalize your experience
5. **Debug Map**: View all clips and their locations (hidden on mobile)

## Testing

### Chrome DevTools
- Use Sensors tab to simulate walking around Berlin
- Test geolocation with coordinates like:
  - Alexanderplatz: `52.5219, 13.4132`
  - Brandenburg Gate: `52.5163, 13.3777`
  - Kreuzberg: `52.4987, 13.4180`

### Sample Test Route
Walk simulation down Oranienstraße in Kreuzberg:
1. Start at `52.4987, 13.4180`
2. Move to `52.4990, 13.4175`
3. Continue to `52.4995, 13.4170`

## Database Schema

### Profiles
- User preferences and like/dislike history
- Links to Supabase Auth users

### Clips
- Audio clips with geolocation data
- 30m default radius for playback zones
- Like/dislike counters for ranking

### Functions
- `get_nearby(lat, lng, max_dist)` - PostGIS spatial query for nearby clips

## PWA Features

- **Offline Cache**: Latest 20 clips + audio cached locally
- **Installable**: Add to home screen on mobile
- **Background Sync**: Queue actions when offline
- **Service Worker**: Handles caching and offline functionality

## Future Enhancements

- **Live Translation**: Whisper → Edge Function → OpenAI translation
- **Spatial Audio**: Pan audio by heading direction
- **Expiring Clips**: 30-day TTL to keep map fresh
- **Capacitor Wrapper**: Native iOS/Android with background location

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Chrome DevTools sensors
5. Submit a pull request

## License

MIT License - feel free to use this for your own audio mapping projects!

---

**SoundMap v1.0.0 - Retro Edition**
*Headphones on, walk, discover.*
