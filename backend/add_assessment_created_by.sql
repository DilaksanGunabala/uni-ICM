-- Migration: Add created_by column to assessments table
-- Run this script against the live database

ALTER TABLE assessments
    ADD COLUMN created_by INT NULL,
    ADD CONSTRAINT fk_assessments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_assessments_created_by ON assessments(created_by);
