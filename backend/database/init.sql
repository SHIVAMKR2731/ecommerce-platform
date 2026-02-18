-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create geography columns for location-based queries
-- Note: Prisma handles this, but we ensure PostGIS is ready