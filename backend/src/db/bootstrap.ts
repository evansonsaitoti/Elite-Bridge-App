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

  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS email_idx ON users(email)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS role_idx ON users(role)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS employer_user_id_idx ON employers(user_id)`);

  coreTablesReady = true;
}
