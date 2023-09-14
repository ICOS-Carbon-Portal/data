/*
	Databases specified in application.conf > cpdata > downloads > dbNames must exist before
	running this initialization. The host must also have postgis installed.
*/

--DROP TABLE IF EXISTS public.downloads;
--DROP TABLE IF EXISTS public.dobjs_extended;

SET work_mem to "32MB";

CREATE EXTENSION IF NOT EXISTS postgis;

-- Revoke user rights here and set them at the end when tables are guaranteed to exist
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM reader;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM writer;


-- Create tables
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

CREATE TABLE IF NOT EXISTS public.dobjs_extended (
	hash_id text NOT NULL PRIMARY KEY,
	dobj_id serial,
	spec text NOT NULL,
	submitter text NOT NULL,
	station text NULL,
	contributors text[] NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dobjs_extended_dobj_id ON public.dobjs_extended (dobj_id);

-- Create a primary key (if not exists) on the hash_id in the new dobjs table
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT constraint_name FROM information_schema.table_constraints
		WHERE table_name = 'dobjs_extended' AND constraint_type = 'PRIMARY KEY'
	) THEN
		ALTER TABLE dobjs_extended ADD PRIMARY KEY (hash_id);
	END IF;
END;
$$;

-- Create view containing relevant download statistics information
DROP VIEW IF EXISTS statIndexEntries;
CREATE OR REPLACE VIEW statIndexEntries AS
	SELECT dl.id, dl.ts, dl.ip, dl.country_code, ds.dobj_id, ds.spec, ds.submitter, ds.station, ds.contributors
	FROM (SELECT id, hash_id, ts, ip, country_code FROM downloads WHERE item_type = 'data' ORDER BY id) AS dl
	INNER JOIN dobjs_extended ds
	ON dl.hash_id = ds.hash_id;



-- Stored Procedures
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
	RETURNS TABLE(id int8)
	LANGUAGE plpgsql
	VOLATILE
AS $$

BEGIN
	IF (SELECT debounceDownload(_ip, _hash_id, _ts) IS NULL) THEN
		IF (_lon IS NULL OR _lat IS NULL) THEN
			RETURN QUERY
				INSERT INTO downloads(item_type, ts, hash_id, ip, city, country_code, distributor, endUser)
				VALUES(_item_type, _ts, _hash_id, _ip, _city, _country_code, _distributor, _endUser)
				RETURNING downloads.id;
		ELSE
			RETURN QUERY
				INSERT INTO downloads(item_type, ts, hash_id, ip, city, country_code, pos, distributor, endUser)
				VALUES(_item_type, _ts, _hash_id, _ip, _city, _country_code, ST_SetSRID(ST_MakePoint(_lon, _lat), 4326), _distributor, _endUser)
				RETURNING downloads.id;
		END IF;
	ELSE RETURN QUERY SELECT -1::int8;
	END IF;
END

$$;


DROP FUNCTION IF EXISTS public.addOrUpdateDobjRecord;
CREATE OR REPLACE FUNCTION public.addOrUpdateDobjRecord(
		_hash_id text,
		_spec text DEFAULT NULL,
		_submitter text DEFAULT NULL,
		_station text DEFAULT NULL,
		_contributors text[] DEFAULT NULL
	)
	RETURNS TABLE(id integer)
	LANGUAGE plpgsql
	VOLATILE
AS $$

BEGIN
	IF ((SELECT 1 FROM dobjs_extended WHERE hash_id = _hash_id) IS NULL) THEN
		RETURN QUERY
			INSERT INTO dobjs_extended(hash_id, spec, submitter, station, contributors)
			VALUES(_hash_id, _spec, _submitter, _station, _contributors)
			RETURNING dobjs_extended.dobj_id;
	ELSE
		RETURN QUERY
			UPDATE dobjs_extended
			SET spec = _spec, submitter = _submitter, station = _station, contributors = _contributors
			WHERE hash_id = _hash_id
			RETURNING dobjs_extended.dobj_id;
	END IF;
END

$$;


DROP FUNCTION IF EXISTS public.dobjIdAndHashId;
CREATE OR REPLACE FUNCTION public.dobjIdAndHashId(
		_dobj_ids int[]
	)
	RETURNS TABLE(dobj_id integer, hash_id text)
	LANGUAGE plpgsql
	VOLATILE
AS $$

BEGIN
	SET seq_page_cost to "5";
	RETURN QUERY SELECT d.dobj_id, d.hash_id FROM dobjs_extended as d WHERE d.dobj_id = ANY(_dobj_ids);
END

$$;


-- Set user rights
GRANT USAGE ON SCHEMA public TO reader;
GRANT USAGE ON SCHEMA public TO writer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO writer;

GRANT INSERT, UPDATE ON public.dobjs_extended TO writer;
GRANT INSERT ON public.downloads TO writer;
GRANT USAGE, SELECT ON SEQUENCE downloads_id_seq TO writer;
GRANT USAGE, SELECT ON SEQUENCE dobjs_extended_dobj_id_seq TO writer;