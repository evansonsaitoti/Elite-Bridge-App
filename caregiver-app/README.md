# Elite Bridge - Caregiver Platform

A modern, responsive web application for caregivers to manage their profiles, find shifts, and earn money.

## Features

- **User Authentication** - Secure registration and login
- **Profile Management** - Complete caregiver profiles with specialties and certifications
- **Shift Discovery** - Browse and apply for available shifts
- **Earnings Tracking** - Monitor earnings and payment history
- **Real-time Messaging** - Communicate with employers
- **Reviews & Ratings** - Build your reputation
- **Clock In/Out** - Track work hours
- **Availability Calendar** - Manage your schedule

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + Zustand
- **API**: Axios
- **Real-time**: Socket.io
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. **Install dependencies**:
   ```bash
   cd caregiver-app
   npm install
   ```

2. **Setup environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3001`

## Project Structure

```
caregiver-app/
├── src/
│   ├── components/       # Reusable components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── context/         # React Context
│   ├── styles/          # CSS styles
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies
```

## Available Scripts

### Development
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Code Quality
```bash
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
npm run test     # Run tests
npm run test:watch # Run tests in watch mode
```

## Pages

### Authentication
- **Login** (`/login`) - User login
- **Register** (`/register`) - New user registration
- **Profile Setup** (`/profile-setup`) - Complete caregiver profile

### Main Application
- **Dashboard** (`/dashboard`) - Main dashboard (coming soon)
- **Shifts** (`/shifts`) - Browse available shifts
- **My Bookings** (`/bookings`) - View current and past bookings
- **Earnings** (`/earnings`) - Track earnings and payments
- **Messages** (`/messages`) - Communicate with employers
- **Profile** (`/profile`) - View and edit profile
- **Settings** (`/settings`) - Account settings

## API Integration

The app connects to the Elite Bridge backend API at `http://localhost:3000/api`.

### Key Endpoints

- `POST /auth/register` - Register new caregiver
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `GET /caregivers/:id` - Get caregiver profile
- `PUT /caregivers/:id` - Update caregiver profile
- `GET /bookings` - Get available shifts
- `POST /bookings/:id/accept` - Accept a shift
- `POST /bookings/:id/clock-in` - Clock in
- `POST /bookings/:id/clock-out` - Clock out

## Authentication

The app uses JWT-based authentication. Tokens are stored in localStorage and automatically included in API requests.

## Real-time Features

Socket.io is used for real-time messaging and notifications. The connection is established automatically when the user logs in.

## Styling

The app uses Tailwind CSS for styling with custom colors:
- **Primary**: `#0b3726` (Dark Green)
- **Accent**: `#c08530` (Gold)

## Development Tips

1. **Hot Module Replacement** - Changes are reflected instantly
2. **TypeScript** - Full type safety
3. **API Proxy** - Dev server proxies API requests to backend
4. **Responsive Design** - Mobile-first approach

## Deployment

### Build for Production
```bash
npm run build
```

This creates a `dist` folder with optimized production build.

### Deploy to Vercel
```bash
vercel deploy
```

## Support

For issues or questions, contact: info@elitebridgestaffing.com

## License

Proprietary - Elite Bridge Staffing
