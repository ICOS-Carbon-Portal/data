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

-- Remove table with typo in its name
DROP VIEW IF EXISTS white_dowloads CASCADE;

-- Remove materialized views that are no longer needed
DROP MATERIALIZED VIEW IF EXISTS downloads_country_mv;
DROP MATERIALIZED VIEW IF EXISTS downloads_timebins_mv;
DROP MATERIALIZED VIEW IF EXISTS dlstats_mv;
DROP MATERIALIZED VIEW IF EXISTS dlstats_full_mv;
DROP MATERIALIZED VIEW IF EXISTS specifications_mv;
DROP MATERIALIZED VIEW IF EXISTS contributors_mv;
DROP MATERIALIZED VIEW IF EXISTS stations_mv;
DROP MATERIALIZED VIEW IF EXISTS submitters_mv;

-- Remove indices that are no longer needed
DROP INDEX IF EXISTS idx_dobjs_hash_id;
DROP INDEX IF EXISTS idx_dobjs_spec;
DROP INDEX IF EXISTS idx_downloads_has_distributor;
DROP INDEX IF EXISTS idx_downloads_debounce;
DROP INDEX IF EXISTS idx_downloads_item_type;

-- Remove functions that are no longer needed
DROP FUNCTION IF EXISTS public.downloadsByCountry;
DROP FUNCTION IF EXISTS public.downloads_timebins;
DROP FUNCTION IF EXISTS public.downloadsPerWeek;
DROP FUNCTION IF EXISTS public.downloadsPerMonth;
DROP FUNCTION IF EXISTS public.downloadsPerYear;
DROP FUNCTION IF EXISTS public.downloadStatsSize;
DROP FUNCTION IF EXISTS public.downloadStats;
DROP FUNCTION IF EXISTS public.specifications;
DROP FUNCTION IF EXISTS public.contributors;
DROP FUNCTION IF EXISTS public.stations;
DROP FUNCTION IF EXISTS public.submitters;
DROP FUNCTION IF EXISTS public.dlfrom;
DROP FUNCTION IF EXISTS public.customDownloadsPerYearCountry;
--DROP FUNCTION IF EXISTS public.downloadedCollections;        -- In use
DROP FUNCTION IF EXISTS public.getMinMaxdate;
DROP FUNCTION IF EXISTS public.getIndexSummary;

-- Create tables
CREATE TABLE IF NOT EXISTS public.dobjs (
	hash_id text NOT NULL PRIMARY KEY,
	spec text NOT NULL,
	submitter text NOT NULL,
	station text NULL
);

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
CREATE INDEX IF NOT EXISTS idx_downloads_item_type_btree ON public.downloads (item_type);

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

CREATE OR REPLACE VIEW white_downloads AS
	SELECT *
	FROM public.downloads
	WHERE distributor IS NOT NULL OR (ip <> '' AND NOT ip::inet <<= ANY(SELECT ip::inet FROM downloads_graylist));


--	Stored Procedures

---------------------
DROP FUNCTION IF EXISTS public.debounceDownload;
CREATE OR REPLACE FUNCTION public.debounceDownload(_ip text, _hash_id text, _ts timestamptz)
	RETURNS int
	LANGUAGE sql
	STABLE
AS $$
-- Returns 1 if record should NOT be included in download statistics
SELECT 1
FROM (SELECT ts, ip, hash_id FROM downloads ORDER BY id DESC LIMIT 1000) AS d
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



-- Create new table including contributors in the dobjs table
CREATE TABLE IF NOT EXISTS dobjs_extended AS
	SELECT
		dobjs.*,
		contrs.contributors
	FROM dobjs
	LEFT JOIN (
		SELECT hash_id, array_agg(contributor) as contributors
		FROM public.contributors
		GROUP BY hash_id) as contrs
	ON dobjs.hash_id = contrs.hash_id;


-- Create a primary key (if not exists) on the hash_id in the new dobjs table
SELECT($$
BEGIN
	IF NOT EXISTS (
		SELECT constraint_name FROM information_schema.table_constraints
		WHERE table_name = 'dobjs_extended' AND constraint_type = 'PRIMARY KEY'
	) THEN
		ALTER TABLE dobjs_extended ADD PRIMARY KEY (hash_id);
	END IF;
END;

$$);


-- Create view containing relevant download statistics information
CREATE OR REPLACE VIEW statIndexEntries AS
	SELECT wd.*, ds.spec, ds.submitter, ds.station, ds.contributors
	FROM (SELECT id, hash_id, ts, country_code FROM white_downloads WHERE item_type = 'data' ORDER BY id) AS wd
	INNER JOIN dobjs_extended ds
	ON wd.hash_id = ds.hash_id;


-- Set user rights
GRANT USAGE ON SCHEMA public TO reader;
GRANT USAGE ON SCHEMA public TO writer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO writer;

GRANT INSERT, UPDATE ON public.dobjs TO writer;
GRANT INSERT, UPDATE ON public.dobjs_extended TO writer;
GRANT INSERT, DELETE ON public.contributors TO writer;
GRANT INSERT ON public.downloads TO writer;
GRANT USAGE, SELECT ON SEQUENCE downloads_id_seq TO writer;

-- Remove redundant tables (uncomment later, when first stage of db migration is done)
-- DROP TABLE IF EXISTS dobjs;
-- DROP TABLE IF EXISTS contributors;
--DROP TABLE IF EXISTS spatial_ref_sys
