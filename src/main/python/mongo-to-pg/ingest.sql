-- Commands to run on both pg databases: cplog and siteslog

-- Make sure we have an empty temporary table for raw json comming from restheart
DROP TABLE IF EXISTS rawjson;
CREATE TABLE public.rawjson (
	ts timestamptz NOT NULL,
	hash_id text NOT NULL,
	jsondata jsonb NOT NULL
);

-- Run python program to populate table rawjson. This will take some time.
-- Check progress of import
SELECT COUNT(*), MIN(ts) AS first_ts, MAX(ts) AS last_ts FROM rawjson;


-- Once python is done, populate our permanent tables (contributors, dobjs and downloads). Make sure backend has created them and that they are receiving data from backend.
-- Debugging: DO NOT EMPTY THESE TABLES ON PRODUCTION
--DELETE FROM contributors;
--DELETE FROM dobjs;
--TRUNCATE TABLE downloads RESTART IDENTITY;

-- Save current state of downloads for removable of duplicates
DROP TABLE IF EXISTS downloadtimes;
SELECT
	MIN(ts) AS first_ts, MAX(ts) AS last_ts
INTO downloadtimes
FROM downloads;

-- Populate destination tables
INSERT INTO dobjs(hash_id, spec, submitter, station)
(SELECT
	hash_id,
	jsondata->'dobj'->'specification'->'self'->>'uri' AS spec,
	jsondata->'dobj'->'submission'->'submitter'->'self'->>'uri' AS submitter,
	jsondata->'dobj'->'specificInfo'->'acquisition'->'station'->'org'->'self'->>'uri' AS station
FROM rawjson
WHERE jsondata->'dobj'->'pid' IS NOT NULL)
ON CONFLICT ON CONSTRAINT dobjs_pkey
DO NOTHING;

INSERT INTO downloads(item_type, ts, hash_id , ip, city, country_code, pos)
(SELECT
	'data' AS item_type,
	ts,
	hash_id,
	jsondata->>'ip' AS ip,
	jsondata->>'city' AS city,
	jsondata->>'country_code' AS country_code,
	ST_GeomFromText('POINT(' || (jsondata->>'longitude') || ' ' || (jsondata->>'latitude') || ')', 4326) AS pos
FROM rawjson
WHERE trim(leading '11676/' from jsondata->'dobj'->>'pid') IS NOT NULL
ORDER BY ts ASC);

INSERT INTO contributors(hash_id, contributor)
(SELECT
	hash_id,
	jsonb_array_elements_text(jsonb_path_query_array(jsondata->'dobj'->'specificInfo'->'productionInfo'->'contributors' || COALESCE(jsondata->'dobj'->'specificInfo'->'productionInfo'->'creator', '[]'::jsonb), '$.self.uri')) as contributor
FROM rawjson
WHERE jsondata->'dobj'->'pid' IS NOT NULL AND jsondata->'dobj'->'specificInfo'->'productionInfo'->'contributors' IS NOT NULL)
ON CONFLICT ON CONSTRAINT contributors_pk
DO NOTHING;

-- Check sanity of duplicate detection. It finds a lot of duplicates in siteslog.
SELECT MIN(id), MAX(id), ts, hash_id, ip, city, country_code, pos
FROM downloads
WHERE ts BETWEEN (SELECT first_ts FROM downloadtimes) AND (SELECT last_ts FROM downloadtimes)
GROUP BY ts, hash_id, ip, city, country_code, pos
HAVING COUNT(id) > 1
ORDER BY ts DESC;

-- Remove duplicates in downloads by keeping the latest record. Ignore them in dojs and contributors 
DELETE FROM downloads
WHERE id IN(
	SELECT MIN(id)
	FROM downloads
	WHERE ts BETWEEN (SELECT first_ts FROM downloadtimes) AND (SELECT last_ts FROM downloadtimes)
	GROUP BY ts, hash_id, ip, city, country_code, pos
	HAVING COUNT(id) > 1
);

-- Cleanup
DROP TABLE IF EXISTS rawjson;
DROP TABLE IF EXISTS downloadtimes;

VACUUM (VERBOSE, ANALYZE) dobjs;
VACUUM (VERBOSE, ANALYZE) downloads;
VACUUM (VERBOSE, ANALYZE) contributors;

REINDEX TABLE dobjs;
REINDEX TABLE downloads;
REINDEX TABLE contributors;
