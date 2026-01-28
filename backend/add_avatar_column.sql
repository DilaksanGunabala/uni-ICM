-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER student_id;
