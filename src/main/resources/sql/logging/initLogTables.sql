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


--	Materialized views to speed up queries

--DROP MATERIALIZED VIEW IF EXISTS downloads_country_mv;
--REFRESH MATERIALIZED VIEW CONCURRENTLY downloads_country_mv;
--VACUUM (ANALYZE) downloads_country_mv
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
--REFRESH MATERIALIZED VIEW CONCURRENTLY downloads_timebins_mv;
--VACUUM (ANALYZE) downloads_timebins_mv
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
--REFRESH MATERIALIZED VIEW CONCURRENTLY dlstats_mv;
--VACUUM (ANALYZE) dlstats_mv
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

--DROP MATERIALIZED VIEW IF EXISTS dlstats_full_mv;
--REFRESH MATERIALIZED VIEW CONCURRENTLY dlstats_full_mv;
--VACUUM dlstats_full_mv
CREATE MATERIALIZED VIEW IF NOT EXISTS dlstats_full_mv AS
	SELECT
		COUNT(hash_id)::int AS count,
		hash_id
	FROM downloads
	GROUP BY hash_id
	ORDER BY count DESC;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dlstats_full_mv_hash_id ON public.dlstats_full_mv (hash_id);

--DROP MATERIALIZED VIEW IF EXISTS specifications_mv;
--REFRESH MATERIALIZED VIEW specifications_mv;
--VACUUM specifications_mv
CREATE MATERIALIZED VIEW IF NOT EXISTS specifications_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		dobjs.spec
	FROM dobjs
		INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
	GROUP BY dobjs.spec;

--DROP MATERIALIZED VIEW IF EXISTS contributors_mv;
--REFRESH MATERIALIZED VIEW contributors_mv;
--VACUUM contributors_mv
CREATE MATERIALIZED VIEW IF NOT EXISTS contributors_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		contributors.contributor
	FROM downloads
		INNER JOIN contributors ON downloads.hash_id = contributors.hash_id
	GROUP BY contributors.contributor;

--DROP MATERIALIZED VIEW IF EXISTS stations_mv;
--REFRESH MATERIALIZED VIEW stations_mv;
--VACUUM stations_mv
CREATE MATERIALIZED VIEW IF NOT EXISTS stations_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		dobjs.station
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	WHERE dobjs.station IS NOT NULL
	GROUP BY dobjs.station;


--	Stored Procedures

---------------------
--DROP FUNCTION IF EXISTS downloadsByCountry;
CREATE OR REPLACE FUNCTION public.downloadsByCountry(_page int, _pagesize int, _specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
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
	country_code IS NOT NULL
	AND (_specs IS NULL OR spec = ANY (_specs))
	AND (_stations IS NULL OR station = ANY (_stations))
	AND (_submitters IS NULL OR submitter = ANY (_submitters))
	AND (_contributors IS NULL OR contributors ?| _contributors)
)
GROUP BY country_code
ORDER BY count DESC
LIMIT _pagesize
OFFSET _page * _pagesize - _pagesize;

$$;

---------------------
--DROP FUNCTION IF EXISTS downloadsPerWeek;
CREATE OR REPLACE FUNCTION public.downloadsPerWeek(_page int, _pagesize int, _specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
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
ORDER BY week_start
LIMIT _pagesize
OFFSET _page * _pagesize - _pagesize;

$$;

---------------------
-- DROP FUNCTION IF EXISTS downloadsPerMonth;
CREATE OR REPLACE FUNCTION public.downloadsPerMonth(_page int, _pagesize int, _specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
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
ORDER BY month_start
LIMIT _pagesize
OFFSET _page * _pagesize - _pagesize;

$$;

---------------------
-- DROP FUNCTION IF EXISTS public.downloadsPerYear;
CREATE OR REPLACE FUNCTION public.downloadsPerYear(_page int, _pagesize int, _specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
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
ORDER BY year_start
LIMIT _pagesize
OFFSET _page * _pagesize - _pagesize;

$$;

---------------------
-- DROP FUNCTION IF EXISTS downloadStats;
CREATE OR REPLACE FUNCTION public.downloadStats(_page int, _pagesize int, _specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int,
		hash_id text
	)
	LANGUAGE plpgsql
	VOLATILE
AS $$
-- Solve confusion with returned column 'count'
#variable_conflict use_column
BEGIN
	IF _specs IS NULL AND _stations IS NULL AND _submitters IS NULL AND _contributors IS NULL THEN
		RETURN QUERY
			SELECT
				count,
				hash_id
			FROM dlstats_full_mv
			LIMIT _pagesize
			OFFSET _page * _pagesize - _pagesize;
	ELSE
		RETURN QUERY
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
			ORDER BY count DESC
			LIMIT _pagesize
			OFFSET _page * _pagesize - _pagesize;
	END IF;
END
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
	count,
	spec
FROM specifications_mv
ORDER BY count;

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
	count,
	contributor
FROM contributors_mv
ORDER BY count;

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
	count,
	station
FROM stations_mv
ORDER BY count;

$$;


-- Set user rights
GRANT USAGE ON SCHEMA public TO reader;
GRANT USAGE ON SCHEMA public TO writer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO writer;

GRANT INSERT, UPDATE ON public.dobjs TO writer;
GRANT INSERT, DELETE ON public.contributors TO writer;
GRANT INSERT ON public.downloads TO writer;
