-- Migration: Add model_used column to public.analyses table

ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'YOLOv11 Medium';
