# Elite Bridge Backend API

Production-ready backend API for Elite Bridge - a dual-platform caregiver staffing system.

## Architecture

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: Socket.io for messaging and notifications
- **Payments**: Stripe integration
- **Authentication**: JWT-based
- **Background Checks**: Chekr integration

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── db/              # Database schema and connection
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── index.ts         # Main server file
├── drizzle/             # Database migrations
├── tests/               # Test files
├── .env.example         # Environment variables template
├── drizzle.config.ts    # Drizzle configuration
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

### Installation

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Setup environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup database**:
   ```bash
   npm run db:generate  # Generate migrations
   npm run db:push     # Apply migrations
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

### Caregivers
- `GET /api/caregivers` - List caregivers
- `GET /api/caregivers/:id` - Get caregiver profile
- `PUT /api/caregivers/:id` - Update caregiver profile

### Employers
- `GET /api/employers` - List employers
- `GET /api/employers/:id` - Get employer profile
- `PUT /api/employers/:id` - Update employer profile

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages` - Get messages
- `GET /api/messages/:conversationId` - Get conversation

### Payments
- `POST /api/payments` - Process payment
- `GET /api/payments` - Get payment history
- `GET /api/payments/:id` - Get payment details

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - List all users
- `POST /api/admin/verify/:userId` - Verify user
- `GET /api/admin/analytics` - Platform analytics

## Database Schema

### Core Tables
- **users** - User accounts (caregivers, employers, admins)
- **caregivers** - Caregiver profiles and details
- **employers** - Employer/company profiles
- **bookings** - Shift bookings and assignments
- **messages** - Real-time messaging
- **reviews** - Ratings and reviews
- **payments** - Payment transactions
- **notifications** - User notifications
- **admin_verifications** - Document and background check verification

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Optional integrations
TWILIO_ACCOUNT_SID=...
FIREBASE_PROJECT_ID=...
CHEKR_API_KEY=...
```

## Development

### Run tests
```bash
npm run test
npm run test:watch
```

### Linting
```bash
npm run lint
npm run format
```

### Database migrations
```bash
npm run db:generate  # Generate new migration
npm run db:push     # Apply migrations
npm run db:migrate  # Run migration script
```

## Deployment

### Build for production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t elite-bridge-api .
docker run -p 3000:3000 --env-file .env elite-bridge-api
```

## Real-time Features (Socket.io)

### Events

**Messaging**
- `join` - Join user's personal room
- `send_message` - Send message to recipient
- `receive_message` - Receive message from sender
- `typing` - Send typing indicator
- `user_typing` - Receive typing indicator

**Notifications**
- `send_notification` - Send notification to user
- `receive_notification` - Receive notification

## Security

- JWT-based authentication
- Password hashing with bcryptjs
- CORS protection
- Helmet for HTTP headers
- Rate limiting on sensitive endpoints
- SQL injection prevention (Drizzle ORM)
- Input validation with Zod

## Performance

- Database connection pooling
- Request logging with Winston
- Error tracking and monitoring
- Caching strategies for frequently accessed data
- Pagination for list endpoints

## Support

For issues or questions, contact: info@elitebridgestaffing.com

## License

Proprietary - Elite Bridge Staffing
