import { sql } from "drizzle-orm";
import { db } from "./index";

let coreTablesReady = false;

export async function ensureCoreTables() {
  if (coreTablesReady) {
    return;
  }

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('caregiver', 'employer', 'admin');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      role user_role NOT NULL DEFAULT 'caregiver',
      phone VARCHAR(20),
      profile_image TEXT,
      verification_status verification_status NOT NULL DEFAULT 'pending',
      email_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS caregivers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT,
      hourly_rate DECIMAL(10,2) NOT NULL DEFAULT '0',
      specialties JSON DEFAULT '[]',
      certifications JSON DEFAULT '[]',
      years_experience INTEGER,
      background_check_status verification_status DEFAULT 'pending',
      background_check_date TIMESTAMP,
      background_check_provider VARCHAR(100),
      background_check_id VARCHAR(255),
      availability JSON,
      rating DECIMAL(3,2) DEFAULT '0',
      total_reviews INTEGER DEFAULT 0,
      total_earnings DECIMAL(15,2) DEFAULT '0',
      total_hours DECIMAL(10,2) DEFAULT '0',
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS employers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_name VARCHAR(255) NOT NULL,
      company_logo TEXT,
      company_description TEXT,
      website VARCHAR(255),
      industry VARCHAR(100),
      service_area JSON,
      verification_status verification_status NOT NULL DEFAULT 'pending',
      tax_id VARCHAR(50),
      billing_address JSON,
      team_size INTEGER,
      total_spent DECIMAL(15,2) DEFAULT '0',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      caregiver_id INTEGER NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      service_type VARCHAR(100) NOT NULL,
      status booking_status NOT NULL DEFAULT 'pending',
      hourly_rate DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(15,2) NOT NULL,
      notes TEXT,
      cancellation_reason TEXT,
      cancelled_by VARCHAR(50),
      cancelled_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      related_id INTEGER,
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expo_push_token VARCHAR(255) NOT NULL UNIQUE,
      platform VARCHAR(20) NOT NULL,
      app VARCHAR(20) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS email_idx ON users(email)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS role_idx ON users(role)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS caregiver_user_unique_idx ON caregivers(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS caregiver_user_id_idx ON caregivers(user_id)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS employer_user_unique_idx ON employers(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS employer_user_id_idx ON employers(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS booking_caregiver_id_idx ON bookings(caregiver_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS booking_employer_id_idx ON bookings(employer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS booking_status_idx ON bookings(status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS notification_user_id_idx ON notifications(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id)`);

  coreTablesReady = true;
}
