-- ============================================================================
-- Add a forward-compatible JSONB column on `rounds` that stores the raw Reddit
-- post `data` object captured at ingest time. Lets a future slice render the
-- attached image (preview.images, gallery_data, media_metadata, thumbnail, ...)
-- without re-hitting Reddit for every existing row. Nullable; rows ingested
-- before this migration stay null until backfilled or re-ingested.
--
-- See `memory/project_images_future.md` for product context.
-- ============================================================================

alter table public.rounds add column reddit_data jsonb;
