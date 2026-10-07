-- Scholarize Database Initialization Script
-- This script creates the database, user, and loads the schema

-- Connect as postgres user to create database and user
-- Run this with: sudo -u postgres psql -f init-database.sql

-- Create database
CREATE DATABASE scholarnet;

-- Create user
CREATE USER scholarnet_user WITH ENCRYPTED PASSWORD '***REMOVED***';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE scholarnet TO scholarnet_user;

-- Grant schema privileges
\c scholarnet
GRANT ALL ON SCHEMA public TO scholarnet_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO scholarnet_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO scholarnet_user;

-- Now load the schema
\i database/schema.sql

-- Confirm
\dt
\echo 'Database initialization complete!'
