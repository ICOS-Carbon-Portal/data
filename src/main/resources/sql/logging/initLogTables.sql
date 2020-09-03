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


--	Materialized views to speed up queries

--DROP MATERIALIZED VIEW IF EXISTS downloads_country_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS downloads_country_mv AS
	SELECT
		MIN(downloads.id) AS id,
		COUNT(*) AS count,
		downloads.country_code,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = downloads.hash_id) AS contributors
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	GROUP BY downloads.country_code, dobjs.spec, dobjs.submitter, dobjs.station, contributors;
CREATE UNIQUE INDEX IF NOT EXISTS idx_downloads_country_mv_id ON public.downloads_country_mv (id);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_spec ON public.downloads_country_mv USING HASH(spec);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_submitter ON public.downloads_country_mv USING HASH(submitter);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_station ON public.downloads_country_mv USING HASH(station);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_contributors ON public.downloads_country_mv USING gin (contributors);

--DROP MATERIALIZED VIEW IF EXISTS downloads_timebins_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS downloads_timebins_mv AS
	SELECT
		MIN(downloads.id) AS id,
		COUNT(*) AS count,
		date_trunc('year', ts)::date AS year_start,
		date_trunc('month', ts)::date AS month_start,
		date_trunc('week', ts)::date AS week_start,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = downloads.hash_id) AS contributors
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	GROUP BY year_start, month_start, week_start, dobjs.spec, dobjs.submitter, dobjs.station, contributors;
CREATE UNIQUE INDEX IF NOT EXISTS idx_downloads_timebins_mv_id ON public.downloads_timebins_mv (id);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_spec ON public.downloads_timebins_mv USING HASH(spec);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_submitter ON public.downloads_timebins_mv USING HASH(submitter);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_station ON public.downloads_timebins_mv USING HASH(station);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_contributors ON public.downloads_timebins_mv USING gin (contributors);

--DROP MATERIALIZED VIEW IF EXISTS dlstats_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS dlstats_mv AS
	SELECT
		dl.count,
		dl.hash_id,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = dl.hash_id) AS contributors
	FROM (
			SELECT
				COUNT(downloads.hash_id) AS count,
				downloads.hash_id
			FROM downloads
			GROUP BY downloads.hash_id
		) dl
		INNER JOIN dobjs ON dl.hash_id = dobjs.hash_id
	ORDER BY dl.count DESC;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dlstats_mv_hash_id ON public.dlstats_mv (hash_id);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_id ON public.dlstats_mv USING HASH(hash_id);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_spec ON public.dlstats_mv USING HASH(spec);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_submitter ON public.dlstats_mv USING HASH(submitter);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_station ON public.dlstats_mv USING HASH(station);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_contributors ON public.dlstats_mv USING gin (contributors);

-- Testing performance. Can be deleted
CREATE MATERIALIZED VIEW IF NOT EXISTS dlstats2_mv AS
	SELECT
		dl.count,
		dl.id,
		dl.hash_id,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = dl.hash_id) AS contributors
	FROM (
			SELECT
				COUNT(downloads.hash_id) AS count,
				downloads.hash_id, 
				MIN(downloads.id) AS id
			FROM downloads
			GROUP BY downloads.hash_id
		) dl
		INNER JOIN dobjs ON dl.hash_id = dobjs.hash_id
	ORDER BY dl.count DESC;


--	Stored Procedures

---------------------
-- DROP FUNCTION IF EXISTS downloadsByCountry;
CREATE OR REPLACE FUNCTION public.downloadsByCountry(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int,
		country_code text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	SUM(count)::int AS count,
	country_code
FROM downloads_country_mv
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
-- DROP FUNCTION IF EXISTS downloadsPerWeek;
CREATE OR REPLACE FUNCTION public.downloadsPerWeek(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int,
		day date,
		week double precision
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	SUM(count)::int AS count,
	week_start AS day,
	EXTRACT('week' from week_start) AS week
FROM downloads_timebins_mv
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
-- DROP FUNCTION IF EXISTS downloadsPerMonth;
CREATE OR REPLACE FUNCTION public.downloadsPerMonth(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int,
		day date
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	SUM(count)::int AS count,
	month_start AS day
FROM downloads_timebins_mv
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
-- DROP FUNCTION IF EXISTS public.downloadsPerYear;
CREATE OR REPLACE FUNCTION public.downloadsPerYear(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int,
		day date
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	SUM(count)::int AS count,
	year_start AS day
FROM downloads_timebins_mv
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
-- DROP FUNCTION IF EXISTS downloadStats;
CREATE OR REPLACE FUNCTION public.downloadStats(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int,
		hash_id text
	)
	LANGUAGE sql
	VOLATILE
AS $$

SELECT
	SUM(count)::int AS count,
	hash_id
FROM dlstats_mv
WHERE (
	(_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY hash_id
ORDER BY 1 DESC;

$$;

-- Test using int for GROUP BY. Can be deleted
CREATE OR REPLACE FUNCTION public.downloadStats2(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int,
		hash_id text
	)
	LANGUAGE sql
	VOLATILE
AS $$

SELECT
	SUM(count)::int AS count,
	MIN(hash_id) AS hash_id
FROM dlstats2_mv
WHERE (
	(_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY id
ORDER BY 1 DESC;

$$;

---------------------
-- DROP FUNCTION IF EXISTS specifications;
CREATE OR REPLACE FUNCTION public.specifications()
	RETURNS TABLE(
		count int,
		spec text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id)::int AS count,
	dobjs.spec
FROM dobjs
	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
GROUP BY dobjs.spec;

$$;

---------------------
-- DROP FUNCTION IF EXISTS contributors;
CREATE OR REPLACE FUNCTION public.contributors()
	RETURNS TABLE(
		count int,
		contributor text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id)::int AS count,
	contributors.contributor
FROM downloads
	INNER JOIN contributors ON downloads.hash_id = contributors.hash_id
GROUP BY contributors.contributor;

$$;

---------------------
-- DROP FUNCTION IF EXISTS stations;
CREATE OR REPLACE FUNCTION public.stations()
	RETURNS TABLE(
		count int,
		station text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id)::int AS count,
	dobjs.station
FROM downloads
	INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
WHERE dobjs.station IS NOT NULL
GROUP BY dobjs.station;

$$;
