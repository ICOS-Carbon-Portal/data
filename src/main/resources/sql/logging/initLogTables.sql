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
CREATE INDEX IF NOT EXISTS idx_dobj_spec ON public.dobjs USING HASH(spec);

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
CREATE INDEX IF NOT EXISTS downloads_hash_id ON public.downloads USING HASH(hash_id);
CREATE INDEX IF NOT EXISTS downloads_item_type ON public.downloads USING HASH(item_type);

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


--	Stored Procedures
---------------------

CREATE OR REPLACE FUNCTION public.downloadsByCountry(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		country_code text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	downloads.country_code
FROM dobjs
	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
WHERE (
	(_specs IS NULL OR dobjs.spec = ANY (_specs))
	AND (_stations IS NULL OR dobjs.station = ANY (_stations))
	AND (_submitters IS NULL OR dobjs.submitter = ANY (_submitters))
	AND (_contributors IS NULL OR EXISTS (SELECT 1 FROM contributors WHERE contributors.hash_id = dobjs.hash_id AND contributors.contributor = ANY(_contributors))) 
)
GROUP BY country_code;

$$;

---------------------

CREATE OR REPLACE FUNCTION public.downloadsPerWeek(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		ts timestamptz,
		week double precision
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	MIN(ts) AS ts,
	MIN(EXTRACT('week' from ts)) AS week
FROM dobjs
	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
WHERE (
	(_specs IS NULL OR dobjs.spec = ANY (_specs))
	AND (_stations IS NULL OR dobjs.station = ANY (_stations))
	AND (_submitters IS NULL OR dobjs.submitter = ANY (_submitters))
	AND (_contributors IS NULL OR EXISTS (SELECT 1 FROM contributors WHERE contributors.hash_id = dobjs.hash_id AND contributors.contributor = ANY(_contributors))) 
)
-- Group by year-week
GROUP BY to_char(ts, 'IYYY-IW');

$$;

---------------------

CREATE OR REPLACE FUNCTION public.downloadsPerMonth(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		ts timestamptz
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	MIN(ts) AS ts
FROM dobjs
	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
WHERE (
	(_specs IS NULL OR dobjs.spec = ANY (_specs))
	AND (_stations IS NULL OR dobjs.station = ANY (_stations))
	AND (_submitters IS NULL OR dobjs.submitter = ANY (_submitters))
	AND (_contributors IS NULL OR EXISTS (SELECT 1 FROM contributors WHERE contributors.hash_id = dobjs.hash_id AND contributors.contributor = ANY(_contributors))) 
)
-- Group by year-month
GROUP BY to_char(ts, 'YYYY-MONTH');

$$;

---------------------

CREATE OR REPLACE FUNCTION public.downloadsPerYear(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		ts timestamptz
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	MIN(ts) AS ts
FROM dobjs
	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
WHERE (
	(_specs IS NULL OR dobjs.spec = ANY (_specs))
	AND (_stations IS NULL OR dobjs.station = ANY (_stations))
	AND (_submitters IS NULL OR dobjs.submitter = ANY (_submitters))
	AND (_contributors IS NULL OR EXISTS (SELECT 1 FROM contributors WHERE contributors.hash_id = dobjs.hash_id AND contributors.contributor = ANY(_contributors))) 
)
-- Group by year
GROUP BY to_char(ts, 'YYYY');

$$;

---------------------

CREATE OR REPLACE FUNCTION public.downloadStats(_specs text[] DEFAULT NULL, _stations text[] DEFAULT NULL, _submitters text[] DEFAULT NULL, _contributors text[] DEFAULT NULL)
	RETURNS TABLE(
		count int8,
		hash_id text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(downloads.hash_id) AS count,
	downloads.hash_id
FROM dobjs
	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
WHERE (
	(_specs IS NULL OR dobjs.spec = ANY (_specs))
	AND (_stations IS NULL OR dobjs.station = ANY (_stations))
	AND (_submitters IS NULL OR dobjs.submitter = ANY (_submitters))
	AND (_contributors IS NULL OR EXISTS (SELECT 1 FROM contributors WHERE contributors.hash_id = dobjs.hash_id AND contributors.contributor = ANY(_contributors))) 
)
GROUP BY downloads.hash_id;

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
