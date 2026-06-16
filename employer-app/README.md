# Elite Bridge - Employer Platform

A modern, responsive web application for employers to post shifts, manage caregivers, and build their team.

## Features

- **User Authentication** - Secure registration and login
- **Company Profile** - Complete company information and services
- **Shift Management** - Create and manage shift postings
- **Caregiver Search** - Find and browse qualified caregivers
- **Booking Management** - Accept/reject caregiver applications
- **Team Management** - Manage team members and permissions
- **Real-time Messaging** - Communicate with caregivers
- **Billing & Invoicing** - Track payments and manage billing
- **Analytics** - Monitor hiring metrics and performance

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
   cd employer-app
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

The app will be available at `http://localhost:3002`

## Project Structure

```
employer-app/
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
- **Login** (`/login`) - Employer login
- **Register** (`/register`) - New employer registration
- **Profile Setup** (`/profile-setup`) - Complete company profile

### Main Application
- **Dashboard** (`/dashboard`) - Main dashboard (coming soon)
- **Post Shift** (`/post-shift`) - Create new shift posting
- **My Shifts** (`/shifts`) - Manage shift postings
- **Applications** (`/applications`) - Review caregiver applications
- **Find Caregivers** (`/caregivers`) - Search and browse caregivers
- **Team** (`/team`) - Manage team members
- **Messages** (`/messages`) - Communicate with caregivers
- **Billing** (`/billing`) - Manage billing and invoices
- **Settings** (`/settings`) - Account and company settings

## API Integration

The app connects to the Elite Bridge backend API at `http://localhost:3000/api`.

### Key Endpoints

- `POST /auth/register` - Register new employer
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `GET /employers/:id` - Get employer profile
- `PUT /employers/:id` - Update employer profile
- `POST /bookings` - Create shift posting
- `GET /bookings/employer/my` - Get my shifts
- `GET /caregivers` - Search caregivers
- `PUT /bookings/:id/accept-caregiver` - Accept caregiver application
- `PUT /bookings/:id/reject-caregiver` - Reject caregiver application

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
