# Breathwork Journey Builder

Build and soundtrack your breathwork journeys.

A simple web app where facilitators can create, structure, and time their breathwork classes — aligning each phase with music and breathing rhythms — all locally, no login or accounts needed.

## Features

### Core Features

1. **Create a Breathwork Class**
   - Enter class title, theme, and total duration
   - Add or remove phases (Grounding, Activation, Hold/Rest, Integration, Custom)
   - Adjust the duration of each phase using sliders
   - Auto-calculates total time

2. **Spotify Music Connection**
   - **With Authentication**: Connect your Spotify account to automatically fetch all tracks from playlists
   - **Without Authentication**: Paste Spotify playlist URLs to get basic info (title, cover image) and manually add tracks
   - Shows mini embedded Spotify player for preview
   - Map tracks from playlists to specific phases in your class

3. **Breathing Rhythm Builder**
   - Select breathing types:
     - Conscious Connected (continuous)
     - Box Breathing (4-4-4-4)
     - 2:1 Ratio (In 4s, Out 8s)
     - Custom
   - Adjust sliders for inhale/exhale times and optional holds
   - Visual rhythm preview with pulsing circle animation

4. **Timeline Overview**
   - Visual timeline bar with segments for each phase
   - Different colors for each phase type
   - Shows linked playlist covers beneath phases
   - Interactive duration adjustment via drag or sliders

5. **Preview & Save Locally**
   - Full preview mode with timeline, music sections, and breathing rhythm animation
   - No login or cloud sync — saves locally in browser storage (localStorage)
   - Export/Import JSON functionality
   - Duplicate classes

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components
- **Lucide React** icons
- **localStorage** for data persistence

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd breathcourse
```

2. Install dependencies:
```bash
npm install
```

3. Set up Spotify Authentication (Optional but recommended):
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - **For Local Development**: Add redirect URI: `http://127.0.0.1:3000/api/spotify/callback`
     - ⚠️ **Important**: Spotify no longer allows `localhost` - you must use `127.0.0.1`
     - HTTP is allowed for loopback addresses (127.0.0.1)
   - **For Production**: Use HTTPS URL: `https://yourdomain.com/api/spotify/callback`
   - Copy your Client ID
   - Create a `.env.local` file in the root directory:
     ```
     NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
     ```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
breathcourse/
├── app/
│   ├── layout.tsx          # Root layout with dark theme
│   ├── page.tsx             # Main page with routing logic
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── ClassForm.tsx        # Class creation/editing form
│   ├── ClassList.tsx        # List of saved classes
│   ├── PhaseEditor.tsx      # Individual phase editor
│   ├── BreathingRhythmBuilder.tsx  # Breathing rhythm configuration
│   ├── SpotifyIntegration.tsx      # Spotify playlist integration
│   ├── Timeline.tsx         # Timeline overview component
│   └── PreviewMode.tsx      # Preview mode with animations
├── lib/
│   ├── storage.ts           # Local storage utilities
│   └── spotify.ts           # Spotify API integration
├── types/
│   └── index.ts             # TypeScript type definitions
└── README.md
```

## Usage

1. **Create a New Class**
   - Click "Create New Class" on the home page
   - Enter class title and optional theme
   - Add phases and configure their durations

2. **Configure Phases**
   - Select phase type (Grounding, Activation, etc.)
   - Adjust duration with slider
   - Set breathing rhythm pattern
   - Add Spotify playlist/track URL

3. **Preview Session**
   - Click "Preview Session" to see the full timeline
   - Watch breathing rhythm animations
   - See music integration

4. **Save & Manage**
   - Classes are automatically saved to localStorage
   - Export classes as JSON
   - Duplicate or delete classes

## Design

- Dark, studio-like interface (calm, elegant)
- Tailwind + shadcn components
- One-screen workflow: left (setup), right (timeline)
- Clean typography, subtle gradients, minimal distractions

## License

MIT
