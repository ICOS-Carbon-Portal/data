/*
	Databases specified in application.conf > cpdata > downloads > dbNames must exist before
	running this initialization. The host must also have postgis installed.
*/

--DROP TABLE IF EXISTS public.downloads;
--DROP TABLE IF EXISTS public.contributors;
--DROP TABLE IF EXISTS public.dobjs;

SET work_mem to "32MB";

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
	pos geometry NULL,
	distributor text NULL,
	endUser text NULL
);
CREATE INDEX IF NOT EXISTS idx_downloads_hash_id ON public.downloads USING HASH(hash_id);
CREATE INDEX IF NOT EXISTS idx_downloads_item_type ON public.downloads USING HASH(item_type);
CREATE INDEX IF NOT EXISTS idx_downloads_has_distributor ON public.downloads ((1)) WHERE distributor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_downloads_debounce ON public.downloads (ip, hash_id);

CREATE TABLE IF NOT EXISTS public.downloads_graylist (
	ip text NOT NULL,
	hostname text NULL,
	reason text NULL
);
TRUNCATE TABLE public.downloads_graylist;
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('193.206.131.194', 'rx1-rm2-ru-unituscia.rm2.garr.net', 'Internal download from ETC');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('193.205.145.87', NULL, 'Internal download from ETC');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('193.205.145.215', NULL, 'Internal download from ETC');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('193.205.145.253', NULL, 'Internal download from ETC');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('188.40.107.37', 'static.37.107.40.188.clients.your-server.de', 'Unknown German user');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('94.130.9.183', 'mail.waldvogel.name', 'Unknown German user');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('114.119.128.0/18', NULL, 'Petalbot');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('140.172.0.0/16', NULL, 'NOAA downloads for their own distribution');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('162.55.85.220', NULL, 'BLEXBot');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('52.58.28.198', NULL, 'hyphen.earth collaboration');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('52.59.40.22', NULL, 'hyphen.earth collaboration');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('3.126.244.229', NULL, 'hyphen.earth collaboration');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('52.167.144.0/24', NULL, 'Bing bot');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('40.77.167.0/24', NULL, 'Bing bot');
INSERT INTO public.downloads_graylist(ip, hostname, reason) VALUES('207.46.13.0/24', NULL, 'Bing bot');


CREATE TABLE IF NOT EXISTS public.contributors (
	hash_id text NOT NULL REFERENCES public.dobjs(hash_id),
	contributor text NOT NULL,
	CONSTRAINT contributors_pk PRIMARY KEY (hash_id, contributor)
);

--	Materialized views to speed up queries

-- DROP MATERIALIZED VIEW IF EXISTS downloads_country_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS downloads_country_mv AS
	SELECT
		MIN(downloads.id) AS id,
		date(downloads.ts) AS day_date,
		COUNT(*) AS count,
		downloads.country_code,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = downloads.hash_id) AS contributors
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist))
	GROUP BY 2, downloads.country_code, dobjs.spec, dobjs.submitter, dobjs.station, contributors;
CREATE UNIQUE INDEX IF NOT EXISTS idx_downloads_country_mv_id ON public.downloads_country_mv (id);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_spec ON public.downloads_country_mv USING HASH(spec);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_submitter ON public.downloads_country_mv USING HASH(submitter);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_station ON public.downloads_country_mv USING HASH(station);
CREATE INDEX IF NOT EXISTS idx_downloads_country_mv_contributors ON public.downloads_country_mv USING gin (contributors);

-- DROP MATERIALIZED VIEW IF EXISTS downloads_timebins_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS downloads_timebins_mv AS
	SELECT
		MIN(downloads.id) AS id,
		COUNT(*) AS count,
		country_code,
		date_trunc('year', ts)::date AS year_start,
		date_trunc('month', ts)::date AS month_start,
		date_trunc('week', ts)::date AS week_start,
		date(ts) AS day_date,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = downloads.hash_id) AS contributors
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist))
	GROUP BY country_code, year_start, month_start, week_start, day_date, dobjs.spec, dobjs.submitter, dobjs.station, contributors;
CREATE UNIQUE INDEX IF NOT EXISTS idx_downloads_timebins_mv_id ON public.downloads_timebins_mv (id);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_country_code ON public.downloads_timebins_mv USING HASH(country_code);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_spec ON public.downloads_timebins_mv USING HASH(spec);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_submitter ON public.downloads_timebins_mv USING HASH(submitter);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_station ON public.downloads_timebins_mv USING HASH(station);
CREATE INDEX IF NOT EXISTS idx_downloads_timebins_mv_contributors ON public.downloads_timebins_mv USING gin (contributors);

-- DROP MATERIALIZED VIEW IF EXISTS dlstats_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS dlstats_mv AS
	SELECT
		dl.id,
		dl.day_date,
		dl.count,
		dl.hash_id,
		dl.country_code,
		dobjs.spec,
		dobjs.submitter,
		dobjs.station,
		(SELECT jsonb_agg(contributor) FROM contributors WHERE contributors.hash_id = dl.hash_id) AS contributors
	FROM (
		SELECT
			MIN(downloads.id) AS id,
			date(ts) AS day_date,
			COUNT(hash_id) AS count,
			hash_id,
			country_code
		FROM downloads
		WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist))
		GROUP BY hash_id, day_date, country_code
		) dl
	INNER JOIN dobjs ON dl.hash_id = dobjs.hash_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dlstats_mv_id ON public.dlstats_mv (id);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_spec ON public.dlstats_mv USING HASH(spec);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_submitter ON public.dlstats_mv USING HASH(submitter);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_station ON public.dlstats_mv USING HASH(station);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_contributors ON public.dlstats_mv USING gin (contributors);
CREATE INDEX IF NOT EXISTS idx_dlstats_mv_day_date ON public.dlstats_mv (day_date);

-- DROP MATERIALIZED VIEW IF EXISTS dlstats_full_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS dlstats_full_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		date(ts) AS day_date,
		downloads.hash_id
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist))
	GROUP BY downloads.hash_id, day_date
	ORDER BY count DESC;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dlstats_full_mv_hash_id_day_date ON public.dlstats_full_mv (hash_id, day_date);

-- DROP MATERIALIZED VIEW IF EXISTS specifications_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS specifications_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		dobjs.spec
	FROM dobjs
		INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist))
	GROUP BY dobjs.spec;
CREATE UNIQUE INDEX IF NOT EXISTS idx_specifications_mv ON public.specifications_mv (spec);

-- DROP MATERIALIZED VIEW IF EXISTS contributors_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS contributors_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		contributors.contributor
	FROM downloads
		INNER JOIN contributors ON downloads.hash_id = contributors.hash_id
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist))
	GROUP BY contributors.contributor;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributors_mv ON public.contributors_mv (contributor);

-- DROP MATERIALIZED VIEW IF EXISTS stations_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS stations_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		dobjs.station
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist)) AND dobjs.station IS NOT NULL
	GROUP BY dobjs.station;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_mv ON public.stations_mv (station);

-- DROP MATERIALIZED VIEW IF EXISTS submitters_mv;
CREATE MATERIALIZED VIEW IF NOT EXISTS submitters_mv AS
	SELECT
		COUNT(downloads.hash_id)::int AS count,
		dobjs.submitter
	FROM downloads
		INNER JOIN dobjs ON downloads.hash_id = dobjs.hash_id
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist))
	GROUP BY dobjs.submitter;
CREATE UNIQUE INDEX IF NOT EXISTS idx_submitters_mv ON public.submitters_mv (submitter);


--	Stored Procedures

---------------------
DROP FUNCTION IF EXISTS downloadsByCountry;
CREATE OR REPLACE FUNCTION public.downloadsByCountry(
		_page int,
		_pagesize int,
		_specs text[] DEFAULT NULL,
		_stations text[] DEFAULT NULL,
		_submitters text[] DEFAULT NULL,
		_contributors text[] DEFAULT NULL,
		_downloaded_from text [] DEFAULT NULL,
		_origin_stations text [] DEFAULT NULL,
		_hash_id text DEFAULT NULL,
		_date_from date DEFAULT NULL,
		_date_to date DEFAULT NULL
	)
	RETURNS TABLE(
		count int,
		country_code text
	)
	LANGUAGE plpgsql
	STABLE
AS $$
#variable_conflict use_column

BEGIN
	_date_from := getMinMaxdate(true, _date_from);
	_date_to := getMinMaxdate(false, _date_to);

	IF _hash_id IS NOT NULL THEN
		RETURN QUERY
			SELECT
				COUNT(*)::int AS count,
				country_code
			FROM downloads
			WHERE hash_id = _hash_id AND country_code IS NOT NULL AND ts BETWEEN _date_from AND _date_to
			GROUP BY country_code
			ORDER BY count DESC;
	ELSE
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				country_code
			FROM downloads_country_mv
			WHERE (
				day_date BETWEEN _date_from AND _date_to
				AND country_code IS NOT NULL
				AND (_specs IS NULL OR spec = ANY (_specs))
				AND (_stations IS NULL OR station = ANY (_stations))
				AND (_submitters IS NULL OR submitter = ANY (_submitters))
				AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
				AND (_contributors IS NULL OR contributors ?| _contributors)
				AND (_origin_stations IS NULL OR station = ANY (_origin_stations))
			)
			GROUP BY country_code
			ORDER BY count DESC;
	END IF;
END

$$;

---------------------
DROP FUNCTION IF EXISTS downloads_timebins;
CREATE OR REPLACE FUNCTION public.downloads_timebins(
		_hash_id text,
		_downloaded_from text[] DEFAULT NULL
	)
	RETURNS TABLE(
		id int8,
		count int,
		country_code text,
		year_start date,
		month_start date,
		week_start date,
		day_date date
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	MIN(id) AS id,
	COUNT(*)::int AS count,
	country_code,
	date_trunc('year', ts)::date AS year_start,
	date_trunc('month', ts)::date AS month_start,
	date_trunc('week', ts)::date AS week_start,
	date(ts) AS day_date
FROM downloads
WHERE (
	hash_id = _hash_id
	AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
)
GROUP BY day_date, country_code, year_start, month_start, week_start;

$$;

---------------------
DROP FUNCTION IF EXISTS downloadsPerWeek;
CREATE OR REPLACE FUNCTION public.downloadsPerWeek(
		_page int,
		_pagesize int,
		_specs text[] DEFAULT NULL,
		_stations text[] DEFAULT NULL,
		_submitters text[] DEFAULT NULL,
		_contributors text[] DEFAULT NULL,
		_downloaded_from text [] DEFAULT NULL,
		_origin_stations text [] DEFAULT NULL,
		_hash_id text DEFAULT NULL,
		_date_from date DEFAULT NULL,
		_date_to date DEFAULT NULL
	)
	RETURNS TABLE(
		count int,
		day date,
		week numeric
	)
	LANGUAGE plpgsql
	STABLE
AS $$
#variable_conflict use_column

BEGIN
	_date_from := getMinMaxdate(true, _date_from);
	_date_to := getMinMaxdate(false, _date_to);

	IF _hash_id IS NOT NULL THEN
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				week_start AS day,
				EXTRACT('week' from week_start) AS week
			FROM downloads_timebins(_hash_id, _downloaded_from)
			WHERE day_date BETWEEN _date_from AND _date_to
			GROUP BY week_start
			ORDER BY week_start;
	ELSE
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				week_start AS day,
				EXTRACT('week' from week_start) AS week
			FROM downloads_timebins_mv
			WHERE (
				day_date BETWEEN _date_from AND _date_to
				AND (_specs IS NULL OR spec = ANY (_specs))
				AND (_stations IS NULL OR station = ANY (_stations))
				AND (_submitters IS NULL OR submitter = ANY (_submitters))
				AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
				AND (_contributors IS NULL OR contributors ?| _contributors)
				AND (_origin_stations IS NULL OR station = ANY (_origin_stations))
			)
			GROUP BY week_start
			ORDER BY week_start;
	END IF;
END

$$;

---------------------
DROP FUNCTION IF EXISTS downloadsPerMonth;
CREATE OR REPLACE FUNCTION public.downloadsPerMonth(
		_page int,
		_pagesize int,
		_specs text[] DEFAULT NULL,
		_stations text[] DEFAULT NULL,
		_submitters text[] DEFAULT NULL,
		_contributors text[] DEFAULT NULL,
		_downloaded_from text [] DEFAULT NULL,
		_origin_stations text [] DEFAULT NULL,
		_hash_id text DEFAULT NULL,
		_date_from date DEFAULT NULL,
		_date_to date DEFAULT NULL
	)
	RETURNS TABLE(
		count int,
		day date
	)
	LANGUAGE plpgsql
	STABLE
AS $$
#variable_conflict use_column

BEGIN
	_date_from := getMinMaxdate(true, _date_from);
	_date_to := getMinMaxdate(false, _date_to);

	IF _hash_id IS NOT NULL THEN
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				month_start AS day
			FROM downloads_timebins(_hash_id, _downloaded_from)
			WHERE day_date BETWEEN _date_from AND _date_to
			GROUP BY month_start
			ORDER BY month_start;
	ELSE
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				month_start AS day
			FROM downloads_timebins_mv
			WHERE (
				day_date BETWEEN _date_from AND _date_to
				AND (_specs IS NULL OR spec = ANY (_specs))
				AND (_stations IS NULL OR station = ANY (_stations))
				AND (_submitters IS NULL OR submitter = ANY (_submitters))
				AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
				AND (_contributors IS NULL OR contributors ?| _contributors)
				AND (_origin_stations IS NULL OR station = ANY (_origin_stations))
			)
			GROUP BY month_start
			ORDER BY month_start;
	END IF;
END

$$;

---------------------
DROP FUNCTION IF EXISTS public.downloadsPerYear;
CREATE OR REPLACE FUNCTION public.downloadsPerYear(
		_page int,
		_pagesize int,
		_specs text[] DEFAULT NULL,
		_stations text[] DEFAULT NULL,
		_submitters text[] DEFAULT NULL,
		_contributors text[] DEFAULT NULL,
		_downloaded_from text [] DEFAULT NULL,
		_origin_stations text [] DEFAULT NULL,
		_hash_id text DEFAULT NULL,
		_date_from date DEFAULT NULL,
		_date_to date DEFAULT NULL
	)
	RETURNS TABLE(
		count int,
		day date
	)
	LANGUAGE plpgsql
	STABLE
AS $$
#variable_conflict use_column

BEGIN
	_date_from := getMinMaxdate(true, _date_from);
	_date_to := getMinMaxdate(false, _date_to);

	IF _hash_id IS NOT NULL THEN
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				year_start AS day
			FROM downloads_timebins(_hash_id, _downloaded_from)
			WHERE day_date BETWEEN _date_from AND _date_to
			GROUP BY year_start
			ORDER BY year_start;
	ELSE
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				year_start AS day
			FROM downloads_timebins_mv
			WHERE (
				day_date BETWEEN _date_from AND _date_to
				AND (_specs IS NULL OR spec = ANY (_specs))
				AND (_stations IS NULL OR station = ANY (_stations))
				AND (_submitters IS NULL OR submitter = ANY (_submitters))
				AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
				AND (_contributors IS NULL OR contributors ?| _contributors)
				AND (_origin_stations IS NULL OR station = ANY (_origin_stations))
			)
			GROUP BY year_start
			ORDER BY year_start;
	END IF;
END

$$;

---------------------
DROP FUNCTION IF EXISTS downloadStatsSize;
CREATE OR REPLACE FUNCTION public.downloadStatsSize(
		_page int,
		_pagesize int,
		_specs text[] DEFAULT NULL,
		_stations text[] DEFAULT NULL,
		_submitters text[] DEFAULT NULL,
		_contributors text[] DEFAULT NULL,
		_downloaded_from text [] DEFAULT NULL,
		_origin_stations text [] DEFAULT NULL,
		_hash_id text DEFAULT NULL,
		_date_from date DEFAULT NULL,
		_date_to date DEFAULT NULL
	)
	RETURNS TABLE(
		size int
	)
	LANGUAGE plpgsql
	VOLATILE
AS $$

BEGIN
	_date_from := getMinMaxdate(true, _date_from);
	_date_to := getMinMaxdate(false, _date_to);

	IF _hash_id IS NOT NULL THEN
		RETURN QUERY
			SELECT SUM(count)::int AS count
			FROM dlstats_full_mv
			WHERE hash_id = _hash_id AND day_date BETWEEN _date_from AND _date_to;

	ELSIF (_specs, _stations, _submitters, _downloaded_from, _contributors, _origin_stations) IS NULL
			AND _date_from = '-infinity'::date
			AND _date_to = 'infinity'::date THEN
		RETURN QUERY
			SELECT COUNT(*)::int AS size
			FROM (
				SELECT SUM(count) AS count
				FROM dlstats_full_mv
				GROUP BY hash_id
			) x;

	ELSE
		RETURN QUERY
			SELECT COUNT(*)::int AS size
			FROM (
				SELECT
					SUM(count) AS count,
					hash_id
				FROM dlstats_mv
				WHERE (
					day_date BETWEEN _date_from AND _date_to
					AND (_specs IS NULL OR spec = ANY (_specs))
					AND (_stations IS NULL OR station = ANY (_stations))
					AND (_submitters IS NULL OR submitter = ANY (_submitters))
					AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
					AND (_contributors IS NULL OR contributors ?| _contributors)
					AND (_origin_stations IS NULL OR station = ANY (_origin_stations))
				)
				GROUP BY hash_id
			) dl;
	END IF;
END
$$;

---------------------
DROP FUNCTION IF EXISTS downloadStats;
CREATE OR REPLACE FUNCTION public.downloadStats(
		_page int,
		_pagesize int,
		_specs text[] DEFAULT NULL,
		_stations text[] DEFAULT NULL,
		_submitters text[] DEFAULT NULL,
		_contributors text[] DEFAULT NULL,
		_downloaded_from text [] DEFAULT NULL,
		_origin_stations text [] DEFAULT NULL,
		_hash_id text DEFAULT NULL,
		_date_from date DEFAULT NULL,
		_date_to date DEFAULT NULL
	)
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
	_date_from := getMinMaxdate(true, _date_from);
	_date_to := getMinMaxdate(false, _date_to);

	IF _hash_id IS NOT NULL THEN
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				hash_id
			FROM dlstats_mv
			WHERE hash_id = _hash_id AND day_date BETWEEN _date_from AND _date_to
			GROUP BY hash_id
			LIMIT _pagesize
			OFFSET _page * _pagesize - _pagesize;

	ELSIF (_specs, _stations, _submitters, _downloaded_from, _contributors, _origin_stations) IS NULL
	          AND _date_from = '-infinity'::date
	          AND _date_to = 'infinity'::date THEN
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				hash_id
			FROM dlstats_full_mv
			GROUP BY hash_id
			ORDER BY count DESC
			LIMIT _pagesize
			OFFSET _page * _pagesize - _pagesize;

	ELSE
		RETURN QUERY
			SELECT
				SUM(count)::int AS count,
				hash_id
			FROM dlstats_mv
			WHERE (
				day_date BETWEEN _date_from AND _date_to
				AND (_specs IS NULL OR spec = ANY (_specs))
				AND (_stations IS NULL OR station = ANY (_stations))
				AND (_submitters IS NULL OR submitter = ANY (_submitters))
				AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
				AND (_contributors IS NULL OR contributors ?| _contributors)
				AND (_origin_stations IS NULL OR station = ANY (_origin_stations))
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

---------------------
-- DROP FUNCTION IF EXISTS stations;
CREATE OR REPLACE FUNCTION public.submitters()
	RETURNS TABLE(
		count int,
		submitter text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	count,
	submitter
FROM submitters_mv
ORDER BY count;

$$;

---------------------
-- DROP FUNCTION IF EXISTS dlfrom;
CREATE OR REPLACE FUNCTION public.dlfrom()
	RETURNS TABLE(
		count int,
		country_code text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	COUNT(*)::int AS count,
	country_code
FROM downloads
WHERE country_code IS NOT NULL
GROUP BY country_code
ORDER BY count;

$$;

---------------------
DROP FUNCTION IF EXISTS public.customDownloadsPerYearCountry;
CREATE OR REPLACE FUNCTION public.customDownloadsPerYearCountry(
		_page int DEFAULT 1,
		_pagesize int DEFAULT 10000,
		_specs text[] DEFAULT NULL,
		_stations text[] DEFAULT NULL,
		_submitters text[] DEFAULT NULL,
		_contributors text[] DEFAULT NULL,
		_downloaded_from text [] DEFAULT NULL,
		_origin_stations text [] DEFAULT NULL,
		_hash_id text DEFAULT NULL,
		_date_from date DEFAULT NULL,
		_date_to date DEFAULT NULL
	)
	RETURNS TABLE(
		year int,
		country text,
		downloads int
	)
	LANGUAGE plpgsql
	STABLE
AS $$

BEGIN
	RETURN QUERY
		SELECT
			date_part('year', year_start)::int AS year,
			country_code AS country,
			SUM(count)::int AS downloads
		FROM downloads_timebins_mv
		WHERE (
			country_code IS NOT NULL AND
			(_specs IS NULL OR spec = ANY (_specs))
			AND (_stations IS NULL OR station = ANY (_stations))
			AND (_submitters IS NULL OR submitter = ANY (_submitters))
			AND (_downloaded_from IS NULL OR country_code = ANY (_downloaded_from))
			AND (_contributors IS NULL OR contributors ?| _contributors)
			AND (_origin_stations IS NULL OR station = ANY (_origin_stations))
		)
		GROUP BY year, country
		ORDER BY year DESC, downloads DESC;
END

$$;

---------------------
DROP FUNCTION IF EXISTS downloadedCollections;
CREATE OR REPLACE FUNCTION public.downloadedCollections()
	RETURNS TABLE(
		month_start text,
		count int
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	date_trunc('month', ts)::date::text AS month_start,
	COUNT(*)::int AS count
FROM downloads
WHERE item_type = 'collection' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist)
GROUP BY 1
ORDER BY 1;

$$;

---------------------
DROP FUNCTION IF EXISTS public.getMinMaxdate;
CREATE OR REPLACE FUNCTION public.getMinMaxdate(_return_min boolean, _day date DEFAULT NULL)
	RETURNS date
	LANGUAGE plpgsql
	STABLE
AS $$

DECLARE _date date;

BEGIN
	IF _day IS NULL THEN
		IF _return_min THEN
			_date := '-infinity'::date;
		ELSE
			_date := 'infinity'::date;
		END IF;

		return _date;
	ELSE
		return _day;
	END IF;
END

$$;

---------------------
DROP FUNCTION IF EXISTS public.debounceDownload;
CREATE OR REPLACE FUNCTION public.debounceDownload(_ip text, _hash_id text, _ts timestamptz)
	RETURNS int
	LANGUAGE sql
	STABLE
AS $$
-- Returns 1 if record should NOT be included in download statistics
SELECT 1
FROM downloads d
WHERE AGE(_ts, d.ts) <= INTERVAL '1' MINUTE AND _ip = d.ip AND _hash_id = d.hash_id LIMIT 1;

$$;

---------------------
DROP FUNCTION IF EXISTS public.addDownloadRecord;
CREATE OR REPLACE FUNCTION public.addDownloadRecord(
		_item_type text,
		_ts timestamptz,
		_hash_id text,
		_ip text,
		_city text DEFAULT NULL,
		_country_code text DEFAULT NULL,
		_lon float DEFAULT NULL,
		_lat float DEFAULT NULL,
		_distributor text DEFAULT NULL,
		_endUser text DEFAULT NULL
	)
	RETURNS void
	LANGUAGE plpgsql
	VOLATILE
AS $$

BEGIN
    IF (SELECT debounceDownload(_ip, _hash_id, _ts) IS NULL) THEN
		IF (_lon IS NULL OR _lat IS NULL) THEN
			INSERT INTO downloads(item_type, ts, hash_id, ip, city, country_code, distributor, endUser)
			VALUES(_item_type, _ts, _hash_id, _ip, _city, _country_code, _distributor, _endUser);
		ELSE
			INSERT INTO downloads(item_type, ts, hash_id, ip, city, country_code, pos, distributor, endUser)
			VALUES(_item_type, _ts, _hash_id, _ip, _city, _country_code, ST_SetSRID(ST_MakePoint(_lon, _lat), 4326), _distributor, _endUser);
		END IF;
	END IF;
END;

$$;

---------------------
DROP FUNCTION IF EXISTS public.getIndexSummary;
CREATE OR REPLACE FUNCTION public.getIndexSummary()
	RETURNS TABLE(
		tbl_mv_name name,
		num_rows int8,
		table_size text,
		index_name name,
		index_size text,
		is_unique text,
		number_of_scans int8,
		tuples_read int8,
		tuples_fetched int8,
		indexdef text
	)
	LANGUAGE sql
	STABLE
AS $$

SELECT
	stat.relname AS tbl_mv_name,
	c.reltuples::bigint AS num_rows,
	pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
	stat.indexrelname AS index_name,
	pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
	CASE WHEN i.indisunique THEN 'Y' ELSE 'N' END AS is_unique,
	stat.idx_scan AS number_of_scans,
	stat.idx_tup_read AS tuples_read,
	stat.idx_tup_fetch AS tuples_fetched,
	idxs.indexdef
FROM pg_stat_user_indexes stat
	INNER JOIN pg_indexes idxs ON stat.indexrelname = idxs.indexname
	INNER JOIN pg_index i ON stat.indexrelid = i.indexrelid
	INNER JOIN pg_class c ON i.indrelid = c.oid
ORDER BY tbl_mv_name, number_of_scans;

$$;

-- Set user rights
GRANT USAGE ON SCHEMA public TO reader;
GRANT USAGE ON SCHEMA public TO writer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO writer;

GRANT INSERT, UPDATE ON public.dobjs TO writer;
GRANT INSERT, DELETE ON public.contributors TO writer;
GRANT INSERT ON public.downloads TO writer;
GRANT USAGE, SELECT ON SEQUENCE downloads_id_seq TO writer;
