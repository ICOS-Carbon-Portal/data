/*
	Databases specified in application.conf > cpdata > downloads > dbNames must exist before
	running this initialization. The host must also have postgis installed.
*/

--DROP TABLE IF EXISTS public.downloads;
--DROP TABLE IF EXISTS public.contributors;
--DROP TABLE IF EXISTS public.dobjs;

CREATE EXTENSION IF NOT EXISTS postgis;

-- Revoke user rights here and set them at the end when tables are guaranteed to exist
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM writer;

-- Create tables
CREATE TABLE IF NOT EXISTS public.dobjs (
	hash_id text NOT NULL PRIMARY KEY,
	spec text NOT NULL,
	submitter text NOT NULL,
	station text NULL
);
CREATE INDEX IF NOT EXISTS idx_dobjs_hash_id ON public.dobjs USING HASH(hash_id);
CREATE INDEX IF NOT EXISTS idx_dobjs_spec ON public.dobjs USING HASH(spec);

CREATE TABLE IF NOT EXISTS public.downloads (
	id int8 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	item_type text NOT NULL CHECK(item_type IN('document', 'data', 'collection')),
	ts timestamptz NOT NULL,
	hash_id text NOT NULL,
	ip text NULL,
	city text NULL,
	country_code text NULL,
	pos geometry NULL
);
CREATE INDEX IF NOT EXISTS idx_downloads_hash_id ON public.downloads USING HASH(hash_id);
CREATE INDEX IF NOT EXISTS idx_downloads_item_type ON public.downloads USING HASH(item_type);

CREATE TABLE IF NOT EXISTS public.contributors (
	hash_id text NOT NULL REFERENCES public.dobjs(hash_id),
	contributor text NOT NULL,
	CONSTRAINT contributors_pk PRIMARY KEY (hash_id, contributor)
);

-- Set user rights
GRANT USAGE ON SCHEMA public TO reader;
GRANT USAGE ON SCHEMA public TO writer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO writer;

GRANT INSERT, UPDATE ON public.dobjs TO writer;
GRANT INSERT, DELETE ON public.contributors TO writer;
GRANT INSERT ON public.downloads TO writer;

--DROP MATERIALIZED VIEW downloads_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS downloads_mv AS
	SELECT
		downloads.id,
		downloads.hash_id,
		downloads.ts,
		date_trunc('year', ts)::date AS year_start,
		date_trunc('month', ts)::date AS month_start,
		date_trunc('week', ts)::date AS week_start,
		downloads.ip,
		downloads.city,
		downloads.country_code,
		downloads.pos,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = downloads.hash_id) AS contributors
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	ORDER BY ts;
CREATE UNIQUE INDEX IF NOT EXISTS idx_downloads_mv_id ON public.downloads_mv (id);
CREATE INDEX IF NOT EXISTS idx_downloads_mv_hash_id ON public.downloads_mv USING HASH(hash_id);
CREATE INDEX IF NOT EXISTS idx_downloads_mv_country_code ON public.downloads_mv USING HASH(country_code);
CREATE INDEX IF NOT EXISTS idx_downloads_mv_year_start ON public.downloads_mv (year_start);
CREATE INDEX IF NOT EXISTS idx_downloads_mv_month_start ON public.downloads_mv (month_start);
CREATE INDEX IF NOT EXISTS idx_downloads_mv_week_start ON public.downloads_mv (week_start);
CREATE INDEX IF NOT EXISTS idx_downloads_mv_contributors ON public.downloads_mv USING gin (contributors);
--REFRESH MATERIALIZED VIEW CONCURRENTLY downloads_mv;

--	Stored Procedures
---------------------
--DROP FUNCTION downloadsByCountry;
CREATE OR REPLACE FUNCTION public.downloadsByCountry(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		country_code text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(*) AS count,
	country_code
FROM downloads_mv
WHERE (
	(_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY country_code
ORDER BY 1 DESC;

$$;

---------------------
--DROP FUNCTION downloadsPerWeek;
CREATE OR REPLACE FUNCTION public.downloadsPerWeek(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		day date,
		week double precision
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(*) AS count,
	week_start AS day,
	EXTRACT('week' from week_start) AS week
FROM downloads_mv
WHERE (
	(_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY week_start
ORDER BY week_start;

$$;

---------------------
--DROP FUNCTION downloadsPerMonth;
CREATE OR REPLACE FUNCTION public.downloadsPerMonth(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		day date
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(*) AS count,
	month_start AS day
FROM downloads_mv
WHERE (
	(_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY month_start
ORDER BY month_start;

$$;

---------------------
--DROP FUNCTION public.downloadsPerYear;
CREATE OR REPLACE FUNCTION public.downloadsPerYear(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		day date
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(*) AS count,
	year_start AS day
FROM downloads_mv
WHERE (
	(_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY year_start
ORDER BY year_start;

$$;

---------------------
--DROP FUNCTION downloadStats;
CREATE OR REPLACE FUNCTION public.downloadStats(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		hash_id text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(*) AS count,
	hash_id
FROM downloads_mv
WHERE (
	(_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY hash_id
ORDER BY 1 DESC;

$$;

---------------------

CREATE OR REPLACE FUNCTION public.specifications()
	RETURNS TABLE(
		count int8,
		spec text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	dobjs.spec
FROM dobjs
	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
GROUP BY dobjs.spec;

$$;

---------------------

CREATE OR REPLACE FUNCTION public.contributors()
	RETURNS TABLE(
		count int8,
		contributor text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	contributors.contributor
FROM downloads
	INNER JOIN contributors ON downloads.hash_id = contributors.hash_id
GROUP BY contributors.contributor;

$$;

---------------------

CREATE OR REPLACE FUNCTION public.stations()
	RETURNS TABLE(
		count int8,
		station text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	dobjs.station
FROM downloads
	INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
WHERE dobjs.station IS NOT NULL
GROUP BY dobjs.station;

$$;
