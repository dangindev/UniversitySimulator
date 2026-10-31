-- Run once with the database owner, after `npm run migrate -w @university-simulator/api`.
-- Create a separate LOGIN role in the provider console and grant it membership in usim_api.
-- Set that login's secret in DATABASE_URL; never reuse the database owner's credentials for the API.
DO $$ BEGIN CREATE ROLE usim_api NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT USAGE ON SCHEMA public TO usim_api;
GRANT SELECT ON schema_migrations TO usim_api;
GRANT SELECT,INSERT,UPDATE ON student_documents,submissions,submission_outbox,execution_reservations TO usim_api;
GRANT SELECT,INSERT ON admin_audit TO usim_api;
CREATE POLICY usim_api_documents ON student_documents TO usim_api USING(true) WITH CHECK(true);
CREATE POLICY usim_api_submissions ON submissions TO usim_api USING(true) WITH CHECK(true);
CREATE POLICY usim_api_outbox ON submission_outbox TO usim_api USING(true) WITH CHECK(true);
CREATE POLICY usim_api_execution ON execution_reservations TO usim_api USING(true) WITH CHECK(true);
CREATE POLICY usim_api_audit ON admin_audit TO usim_api USING(true) WITH CHECK(true);
-- Anon/authenticated visitor roles have no policy and must never receive membership in usim_api.
