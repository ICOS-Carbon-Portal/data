# ICOS Carbon Portal's Data Service

Data service for:

- uploading and ingesting ICOS data objects for storage and PID assignment
- searching, fetching data objects
- previewing the datasets and their metadata
- viewing lat/lon geo grid [NetCDF data](https://data.icos-cp.eu/netcdf/)

---

*(To set up a local development environment, see the [Information for developers](https://github.com/ICOS-Carbon-Portal/data/tree/master#information-for-developers) section)*

## Instruction for uploading ICOS data objects

In HTTP protocol terms, the upload is performed by HTTP-PUTing the contents of the data object with chunked transfer encoding and cookie authentication to a URL of the form `https://data.icos-cp.eu/objects/<data object id>`, where `<data object id>` is either [base64url](https://en.wikipedia.org/wiki/Base64#URL_applications)- or hex-encoded representation of the first 18 bytes of a SHA-256 hashsum of the data object's contents. The complete 32-byte representations are also accepted. You will have obtained the data object id by the time you have completed the [first step](https://github.com/ICOS-Carbon-Portal/meta#registering-the-metadata-package) of the [2-step upload procedure](https://github.com/ICOS-Carbon-Portal/meta#data-object-registration-and-upload-instructions). The authentication cookie can be obtained from [CPauth](https://cpauth.icos-cp.eu) as described [here](https://github.com/ICOS-Carbon-Portal/meta#authentication).

For example, using the command-line tool `curl`, one can perform the upload as follows:

`curl -v -H "Transfer-Encoding: chunked" -H "Cookie: cpauthToken=<base64-encoded signed token>" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

Alternatively, if you previously logged in to CPauth with `curl` and wrote the authentication cookie to `cookies.txt`, you can run

`curl -v --cookie cookies.txt -H "Transfer-Encoding: chunked" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

### Trying ingestion

When developing client code for data upload, one may wish to test data objects for compliance with a certain format, to check whether an exact binary version of a data object can pass the server-side ingestion/validation step used during upload. This is useful to avoid registering metadata packages for invalid data objects. This endpoint does not perform the complete standard upload flow: it does not check the object's hash, require upload authentication, store the object permanently, or complete a metadata package upload.

The API is available through HTTP PUTing the data object contents to URL of the form

`https://data.icos-cp.eu/tryingest?specUri=<obj spec uri>&nRows=<number of rows>` (for tabular time-series data), or

`https://data.icos-cp.eu/tryingest?specUri=<obj spec uri>&varnames=<variable names>` (for spatial NetCDF data), where

- `specUri` is URL-encoded URL of the planned object specification ([examples](https://meta.icos-cp.eu/ontologies/cpmeta/SimpleObjectSpec)); this parameter is mandatory
- `nRows` is the number of rows in the time series; this is required for most tabular time-series formats, but not for formats where the ingester can infer the row count, such as ATC files
- `varnames` is URL-encoded JSON array with names of the variables that are expected to be previewable; this is required for spatial NetCDF tryingestion

On success, the response is either JSON with extracted ingestion metadata or a plain success message, depending on the object specification and ingester. Ingestion failures are returned as `400 Bad Request` with error details.

With curl, the test can be performed for example as follows:

```bash
curl --upload-file ICOS_ATC_NRT_MTO.zip 'https://data.icos-cp.eu/tryingest?specUri=http://meta.icos-cp.eu/resources/cpmeta/atcMtoL2DataObject'
```

or (may not work depending on the curl version or operating system):

```bash
curl -G --data-urlencode "specUri=http://meta.icos-cp.eu/resources/cpmeta/inversionModelingSpatial" \
--data-urlencode 'varnames=["co2flux_land", "co2flux_ocean"]' \
--upload-file Jena_s99_v3.7_monthly.nc  https://data.icos-cp.eu/tryingest
```

### Internal re-ingestion

In some circumstances one may need to update the binary results of data ingestion without changing the data itself. In this case the server can use data objects that are already available, and redo only the ingestion part of the upload. This process can be initiated by an empty-payload HTTP POST call to data object's upload URL, like so:

`curl -X POST -H "Cookie: cpauthToken=<base64-encoded signed token>" https://data.icos-cp.eu/objects/<data object id>`

---

## Accessing data objects

After having been uploaded to Carbon Portal, the data objects can be accessed using a variety of methods. Access to the original data objects and their metadata can be performed anonymously, but some of the services require prior user login and acceptance of the [data licence](https://data.icos-cp.eu/licence) in your [user profile](https://cpauth.icos-cp.eu/), as described below.

### Accepting the data licence

To avoid being repeatedly asked to accept the [data licence](https://data.icos-cp.eu/licence) during every download operation, users have the option of [logging in](https://cpauth.icos-cp.eu/login/) using a number of supported login methods: eduGAIN university trust federation, ORCID ID, Facebook account, or a traditional username/password (functional email account is required for account creation in the latter case). After logging in, the user may choose to read and accept the [data licence](https://data.icos-cp.eu/licence) in their [user profile](https://cpauth.icos-cp.eu/) by marking the corresponding checkbox and saving their Carbon Portal user profile. In addition to avoiding the repeated licence acceptance ceremony in the future, this will also enable programmatic access to the data objects.

### Access using the portal web app

The most user-friendly way of accessing the data objects is through the [portal app](https://data.icos-cp.eu/portal/), which allows multi-faceted search, data preview and download, including batch download of many objects selected into a so-called "data cart". Raw ICOS data (level 0) is often findable, but not openly available for preview and download due to ICOS policy (the data is still available on request).

### Access through data object landing pages

Data objects are identified using cryptographic SHA-256 hashsums of their binary content. Most of them are issued a PID based on the hashsum, for example `11676/-YB8ISMm1AT8EVv9zgjK-6S2`, which can be resolved to the location of data object's landing page using <https://handle.net> service, for example <https://hdl.handle.net/11676/-YB8ISMm1AT8EVv9zgjK-6S2>. Where applicable, the landing pages contain access URLs for downloading of the original data objects. The download process will involve licence acceptance, if the user is not logged in with CP or has not [accepted the licence](#accepting-the-data-licence). This method is also user-friendly, usable from a Web browser.

### Downloading originals programmatically

Users that have [accepted the data licence](#accepting-the-data-licence) can also download the data objects programmatically by sending an HTTP GET request to the access URL and supplying their `cpauthToken` (available on the [user profile page](https://cpauth.icos-cp.eu/home/)) as a cookie. Typically, access URL has the form `https://data.icos-cp.eu/objects/<hash_id>`, where `<hash_id>` is a PID suffix, for example `aYB8ISMm1AT8EVv9zgjKn6S2`. The server will respond with data object contents in the response payload, and supply the file name in HTTP header `content-disposition: attachment; filename="..."`.

Using this API with, for example, `curl`, one can save a data object to a current directory using the file name from the server response like so:

`curl -JO 'https://data.icos-cp.eu/objects/-YB8ISMm1AT8EVv9zgjK-6S2' --cookie "cpauthToken=..."`

The authentication tokens have a limited validity time (100000 seconds or 27.8 hours), which makes it necessary to refresh them daily. For everyday usage, this becomes an inconvenience. It is possible to renew the token programmatically. For this, a user needs to create a "traditional" username/password account at CP. After this, a fresh token can be retrieved [as described](https://github.com/ICOS-Carbon-Portal/meta/#authentication) in the instructions for data object metadata upload.

### Accessing the data object metadata

CP data objects are accompanied with extensive metadata which can be used, among other things, for interpretation of the object's contents. Ways to access the metadata are described [here](https://github.com/ICOS-Carbon-Portal/meta/#data-objects)

### CSV download for tabular time-series data

Storage and preservation is the basic level of support offered to all data objects.
Some, usually simple tabular time-series data of levels 1 and 2, are also supplied with extensive metadata about their columnar content, and undergo parsing, validation and ingestion processes during upload.
This makes the data objects findable by variables of interest, and enables CP to offer very efficient data previews ([example](https://data.icos-cp.eu/dygraph-light/?objId=EBmVEuoJaOmOw8QmUyyh6G-n&x=TIMESTAMP&y=H_F_MDS&type=line&linking=overlap)).
Additionally, this extra treatment makes it possible to offer direct programmatic data access to selected columns in the datasets, while providing the data in a standardized plain CSV format, uniform for all tabular datasets, regardless of the format of the original.
(In practice, data objects supplied by various research communities significantly differ in many important details, even if the formats are CSV-based; this complicates data reuse, forcing users to write their own parsing code for each of the formats).

**It must be noted** that CSV download is not guaranteed to be a full-fledged replacement of the original data objects.
This is an extra service offered by the Carbon Portal on a best-effort basis, effectively constitutes a format transformation from the original (even if the original was a CSV), and may offer fewer columns than the original, as the original objects may contain extra columns not mentioned in the columnar metadata (and therefore not available for CSV download).

The API to download the plain CSV serialization is similar to that for [download of data object originals](#downloading-originals-programmatically), but with a different access URL and extra URL parameters for column selection, row offset and row limit.
Example:

`curl -JO https://data.icos-cp.eu/csv/x7l3Y6Mvg83ig0rINEBfEQVe?col=TIMESTAMP&col=ch4&col=Flag&offset=0&limit=20 --cookie "cpauthToken=..."`

All the URL parameters are optional. When none are present, all the columns known to the metadata store will be provided. When offset is not present, zero offset is assumed; when limit is not present, end of the dataset is assumed. The list of columns can be [looked up](https://github.com/ICOS-Carbon-Portal/meta/#data-objects) in data object metadata, either on the landing page, or programmatically. **Note** that just like with [downloading the originals](#downloading-originals-programmatically), this API is simple to use with a Web browser, one only needs to login with CP, accept the data licence and visit the CSV access URL (the cookie will be supplied by the browser).

### Python library for data and metadata access

The APIs described above are HTTP-based and programming language agnostic, therefore can be used from arbitrary programming language. However, for the Python users, there currently exist two dedicated libraries:

- a newer foundational library [`icoscp_core`](https://pypi.org/project/icoscp_core/) offering excellent performance and consistency with the server APIs, and suitable for all meta/data repositories based on the ICOS Carbon Portal technology stack (currently ICOS, SITES, and ICOS Cities); it is meant to be robust and provide all the basic features deemed necessary to support most applications.
- an older library [icoscp](https://icos-carbon-portal.github.io/pylib/) that contains (partially refurbished) legacy code, but also in the future is meant to provide a series of higher-level ICOS-specific features built on top of `icoscp_core`.

Thus, the recommendation to the users is to reach out for [`icoscp_core`](https://pypi.org/project/icoscp_core/) as the first choice for all new projects, and to resort to `icoscp` for newer higher-level ICOS-specific features, as they get developed. For the maintainers of code based on `icoscp` the recommendation is to follow its new releases. The next release is planned to have `icoscp_core` as a dependency, thereby opening three opportunities:
 - gradually porting the code to `icoscp_core` (maximal benefits for moderate effort)
 - switch to using a new implementation of `Dobj` class within the `icoscp` library (moderate benefits for minimal effort); the upgrade guide will be included with release `0.2.0` of `icoscp`
 - keep usind the legacy code, as it will be preserved (no benefits for zero effort)

### (Internal use) HTTP access to ingested tabular time series in binary format

Similarly to CSV downloads, one can request binary data in a trivial columnar format ("Carbon Portal binary") from the access URL https://data.icos-cp.eu/cpb .
The client is expected to HTTP POST an `application/json` payload to the access URL, with a structure identical to the one expected by the (now deprecated) access URL https://data.icos-cp.eu/portal/tabular ; it is defined by class [BinTableRequest](https://github.com/ICOS-Carbon-Portal/data/blob/6c40c54a0a9685f671d216628acdd61be83e7b07/src/main/scala/se/lu/nateko/cp/data/services/fetch/FromBinTableFetcher.scala#L13).
However, in addition to this payload, the request must also contain a `Cookie` header with a `cpauthToken` of a user, and the user must have accepted the [data licence](https://data.icos-cp.eu/licence) in their [CP user profile](https://cpauth.icos-cp.eu/home).
Just like with CSV downloads and downloads of originals, retrieval of the `cpauthToken` can be easily automated, if the user has an email/password account with CP.
However, unlike CSV and originals downloads, this API is not suitable for manual usage from a Web browser, and is intended for library authors, not for the end users of the data.

Example `curl` request:

`curl 'https://data.icos-cp.eu/cpb' -X POST -H 'Accept: application/octet-stream' -H 'Content-Type: application/json' -H 'Cookie: cpauthToken=...' --data-raw '{"tableId":"jp6gD9iKcmjorb0fBzQYFTGI","schema":{"columns":["CHAR","INT","FLOAT","DOUBLE","FLOAT"],"size":24},"columnNumbers":[3,4,0],"subFolder":"asciiAtcProductTimeSer"}'`


### Spatiotemporal NetCDF files

Another format of data that is offered extended support is spatiotemporal (geo data with temporal component) NetCDF.
CP does not, at the time of this writing, offer a documented programmatic access to the data in these files, but does provide variable metadata, guarantees presence of the announced variables in the NetCDF files, and hosts a GUI app for the data previews ([example](https://data.icos-cp.eu/netcdf/OPun_V09Pcat5jomRRF-5o0H?gamma=0.5&center=53.92090,10.37109&zoom=4&color=yellowRed)).

---

## Simplified ETC-specific facade API for data uploads

The facade uses Basic HTTP Authentication. Username is the station's id.
For testing purposes one can use fake station `FA-Lso` and password `p4ssw0rd`.
The uploaded data is analyzed (MD5 sum gets calculated for it), and, if the checksum matches, the facade performs [upload metadata registration](https://github.com/ICOS-Carbon-Portal/meta#registering-the-metadata-package) and internal data object upload.

The features and functional principles of the facade are described in more detail in [source code comments](https://github.com/ICOS-Carbon-Portal/data/blob/master/src/main/scala/se/lu/nateko/cp/data/services/etcfacade/FacadeService.scala#L45)

Here is an example of uploading bytes in the string `test` to the service (performed on Linux command line):

`$ echo -n 'test' | md5sum`

`098f6bcd4621d373cade4e832627b4f6  -`

`$ curl -X PUT --data 'test' https://FA-Lso:p4ssw0rd@data.icos-cp.eu/upload/etc/098f6bcd4621d373cade4e832627b4f6/FA-Lso_EC_201301011200_L03_F01.csv`

`OK`

To upload a file from the command line:

`$ md5sum FA-Lso_EC_201301011300_L03_F01.csv`

`098f6bcd4621d373cade4e832627b4f6  -`

`$ curl --upload-file FA-Lso_EC_201301011300_L03_F01.csv https://FA-Lso:p4ssw0rd@data.icos-cp.eu/upload/etc/098f6bcd4621d373cade4e832627b4f6/FA-Lso_EC_201301011300_L03_F01.csv`

`OK`

In HTTP terms, the binary contents of the file must be HTTP PUT to the URL whose format is shown in the examples.

File names are validated. Here is the output from our unit tests for this:

	[info] EtcFilenameTests:
	[info] - BE-Lon_BM_20170815_L99_F01.dat is a valid filename
	[info] - BE-Lon_BM_20170815_L99_F01.zip is a valid filename
	[info] - BE-Lon_BM_20170815_L99_F01.bin is a valid filename
	[info] - BE-Lon-BM-20170815-L99-F01.dat is not a valid filename (must use underscores)
	[info] - BE-Lon_BM_201708151134_L99_F01.dat is not a valid filename (time only allowed in EC files)
	[info] - FA-Lso_EC_201202040437_L03_F12.csv is a valid EC filename with time
	[info] - FA-Lso_EC_201202040437_L03_F12.blabla is not a valid filename (too long file extension)
	[info] - FA-Lso_EC_201202040437_L03_F12.xxx is not a valid filename (unsupported file extension)
	[info] - FA-lso_EC_201202040437_L03_F12.csv is not a valid filename (bad station id format)
	[info] - FAA-Lso_EC_201202040437_L03_F12.csv is not a valid filename (bad station id format)
	[info] - FA-Lso_EC_201202040437_F12.csv is not a valid filename (logger number missing)
	[info] - FA-Lso_XX_201202040437_L03_F12.csv is not a valid filename (bad data type)
	[info] - FA-Lso_EC_20120204_L03_F12.csv is not a valid filename (EC files must have time)
	[info] - Parsing 'FA-Lso_EC_201202040437_L03_F12.csv' gives EtcFilename with correct toString
	[info] - Parsing 'BE-Lon_BM_20170815_L99_F01.dat' gives EtcFilename with correct toString

Please note that Eddy flux files (EC data type), being half-hourly rather than daily, are treated specially.
Please see the [source code comments](https://github.com/ICOS-Carbon-Portal/data/blob/master/src/main/scala/se/lu/nateko/cp/data/services/etcfacade/FacadeService.scala#L53) for details.
(At the time of this writing, the time of forced EC daily package uploads is 04:00 UTC, and the max age of old files in staging is 30 days)

Other types of files are uploaded by the facade to the Carbon Portal immediately.

To observe the effect of an upload of a file to the facade, one can:

- inspect the contents of the [staging folder](https://data.icos-cp.eu/etcfacade/) (half-hourly EC files and problematic files are to be found there, together with upload- and error logs)
- search for the raw data submitted by a respective station on the [search app](https://data.icos-cp.eu/portal/) (due to Web browser cache, the files may take up to 1 hour to appear; you may want to temporarily disable cache in your Web browser to see the uploads sooner)

### Obtaining a receipt from the logger facade

For increased traceability of file uploads to the logger facade, the latter returns unique receipts for every accepted data file. The receipt is returned as the value of a custom HTTP header `X-ICOSCP-Receipt`. A receipt can look as follow:

`hGWKklUBlC3WslvazCuikpOTwlKTl4c9NpiFi_KoJUQ_ymH2FJyADaXCwpmgbYtxSt813pr-0smsxgzwF2spVuolYcRVCUy8HKSWgb9im40`

It can be obtained by examining the HTTP headers of the response from any programming language. When using `curl`, one has the possibility of saving the HTTP headers to a file which can be specified with `-D` or `--dump-header` option.

After obtaining a receipt, one can read it at URL
`https://data.icos-cp.eu/upload/etc/receipt/<receipt>`,
where `<receipt>` is the receipt text. The example receipt can be read [here](https://data.icos-cp.eu/upload/etc/receipt/hGWKklUBlC3WslvazCuikpOTwlKTl4c9NpiFi_KoJUQ_ymH2FJyADaXCwpmgbYtxSt813pr-0smsxgzwF2spVuolYcRVCUy8HKSWgb9im40).

## Reporting data object downloads (for partners distributing ICOS data)

If you distribute ICOS data, you are requested to report all downloads of ICOS data objects to the Carbon Portal. Technically, the reporting can be done by HTTP-POSTing a string with a list of data object PIDs (newline-separated) to URL `https://data.icos-cp.eu/logExternalDownload`. Basic HTTP Authentication must be used, with user name and password provided to you by Carbon Portal. The IP address of the user's machine should be provided as a URL query parameter `ip`. If not provided, IP address of the machine reporting the download will be used as downloader's IP instead.
Additionally, an arbitrary string characterizing the end user without identifying her/him (e.g. organization, but not email address) may be provided as a URL query parameter `endUser`.

Here is an example of the API usage with `curl` from Linux command line:

`$ curl -X POST --data $'11676/-bkHsZC3pt9nHiVegEBpvO3I\n11676/28VighT02O1PiY4pUp71F69O' 'https://noaa:password@data.icos-cp.eu/logExternalDownload?ip=123.234.1.1&endUser=Wageningen%20University'`

The example reports download of two data objects (PIDs are separated with `\n`) by a machine with IP address `123.234.1.1` (random example). Correct password must be used.

---

## Information for developers

**Local development setup for `data`**

### 1. Overview

```mermaid
flowchart LR
	Browser -->|"http://localhost:9011"| Data["data backend (sbt ~reStart, :9011)"]
	Browser -->|"SPARQL, auth, profiles (hard-coded https)"| Prod["production meta / cpauth / restheart"]
	Data -->|"SPARQL + upload API"| Meta["local meta (:9094)"]
	Data -->|"download stats"| PG["PostgreSQL + PostGIS (:5438)"]
	Data -->|"portal usage, user profiles"| RH["RestHeart (:8088)"]
	RH --> Mongo["MongoDB"]
```

> [!NOTE]
> The **browser-side** apps (portal and the others) don't talk to your local meta. `src/main/js/common/main/config.js` builds `https://<metaHost>/sparql` and `https://<authHost>/…`, and hard-codes `restheart.icos-cp.eu`. With the default `metaHost = meta.icos-cp.eu`, the portal searches **production metadata**. Only the **Scala backend** uses your local meta (for uploads, downloads, landing-page metadata and collections).

### 2. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| JDK | **21** | CI uses Temurin 21. `-Xtarget:11`, so 11+ compiles, but stick to 21. |
| sbt | any launcher | The build pins `sbt.version=1.10.6` and the launcher downloads it. With an sbt **2.x** launcher, use `sbt --no-client` if the shell behaves oddly. |
| Node.js | **22 or 24 LTS** | Minimum is `^20.19 \|\| >=22.12` (Vite 8 in `portal`). **Not** the Node 8 the README says. Very new Node versions (25+) may break the older webpack/karma tooling. |
| Docker + Compose | recent | Runs PostgreSQL/PostGIS and RestHeart/MongoDB. |
| Network | `repo.icos-cp.eu` reachable | `.sbtopts` forces **all** dependency resolution through ICOS's repos (see [Part 2](#22-other-things-that-can-go-wrong)). |
| meta | running on `:9094` | Default `cpdata.meta.baseUrl = "http://127.0.0.1:9094/"`. |

### 3. Check ports and meta

```bash
# Ports data needs: 9011 (data), 5438 (Postgres), 8088 (RestHeart); 9094 should be meta
ss -ltnp | grep -E ':(9011|5438|8088|9094)\b'

# meta's SPARQL endpoint should answer
curl -s -H 'Accept: text/csv' --data-urlencode 'query=SELECT * WHERE { ?s ?p ?o } LIMIT 1' \
  http://127.0.0.1:9094/sparql
```

> [!TIP]
> If your meta setup **already** gives you a PostGIS on `5438` or a RestHeart on `8088`, reuse it. You only need to create the databases and roles from §4. Otherwise, the containers below will clash on those ports.

### 4. Start PostgreSQL/PostGIS and RestHeart/MongoDB

At startup the backend **refuses to bind its port** unless both of these succeed: the Postgres log-table init and the RestHeart DB/collection init ([Main.scala](src/main/scala/se/lu/nateko/cp/data/Main.scala#L139-L160)). Put the two files below in a folder **outside** the repo (for example `~/cpdata-dev/`).

`pg-init.sql`: the databases and roles the init script expects ([initLogTables.sql](src/main/resources/sql/logging/initLogTables.sql)):

```sql
CREATE ROLE reader LOGIN;
CREATE ROLE writer LOGIN;
CREATE DATABASE cplog;     -- ICOS
CREATE DATABASE siteslog;  -- SITES
CREATE DATABASE paullog;   -- ICOS Cities
```

`docker-compose.yml`:

```yaml
services:
  postgis:
	image: postgis/postgis:16-3.4
	ports: ["5438:5432"]                 # data expects 5438, not 5432
	environment:
	  POSTGRES_HOST_AUTH_METHOD: trust   # data's default passwords are empty; local dev only!
	volumes:
	  - ./pg-init.sql:/docker-entrypoint-initdb.d/pg-init.sql
	  - pgdata:/var/lib/postgresql/data

  mongo:
	image: mongo:7
	volumes:
	  - mongodata:/data/db

  restheart:
	image: softinstigate/restheart:8
	depends_on: [mongo]
	ports: ["8088:8080"]
	environment:
	  # connect to the mongo container and expose ALL databases at the root
	  # (data uses /db, /sitesdb, /pauldb as database paths)
	  RHO: >-
		/mclient/connection-string->"mongodb://mongo";
		/mongo/mongo-mounts->[{"what":"*","where":"/"}]

volumes:
  pgdata:
  mongodata:
```

```bash
cd ~/cpdata-dev && docker compose up -d

# sanity checks
docker compose exec postgis psql -U postgres -c '\l' | grep -E 'cplog|siteslog|paullog'
curl -s -u admin:secret http://127.0.0.1:8088/ | head -c 300; echo
```

> [!NOTE]
> `pg-init.sql` only runs on the **first** start, while the `pgdata` volume is empty. If you change it later, run `docker compose down -v` to recreate the volume.

> [!WARNING]
> RestHeart 7/8 **requires authentication** (default user `admin` / `secret`). `data` supports Basic auth through optional `username` / `password` fields on each RestHeart DB entry, which is why they appear in the config below. RestHeart 8 and its configuration keys (`RHO`, `mongo-mounts`) differ from the older RestHeart that production historically ran. If the RestHeart init fails, check the `data` log for the failing request. As a fallback, set `restheart.base.skipInit = true` (see §1.8).

### 5. Create the root `application.conf`

**Duplicate `example.application.conf` and rename it into `application.conf`.**

The backend reads `./application.conf` from its working directory (the repo root when you use sbt). It's layered on top of the bundled [src/main/resources/application.conf](src/main/resources/application.conf), so keep it small and only override what you need ([CpdataConfig.scala](src/main/scala/se/lu/nateko/cp/data/CpdataConfig.scala#L155-L163)). This file is gitignored.

### 6. Build the frontend and start the backend

```bash
cd /path/to/data
sbt
```

In the sbt shell:

```text
cpFrontendApps                 # lists: dygraph-light, map-graph, netcdf, portal, stats, dashboard
cpFrontend install common      # npm ci for the shared code
cpFrontend install portal      # npm ci; repeat for every app you'll work on (first time / after lockfile changes)
cpFrontend build portal        # starts a resident watcher in the background; NO "~" in front
~reStart                       # backend on http://localhost:9011, restarts on Scala/Twirl changes
```

- Start the frontend watcher **before** `~reStart`, because `~reStart` takes over the shell. Press Enter to leave watch mode.
- Only **one** frontend watcher runs at a time. Running `cpFrontend build stats` replaces the portal watcher.
- Built JS goes to `target/scala-3.3.4/classes/frontendapps/` and is served from there, so frontend changes show up after a browser reload without restarting the backend.
- If the frontend complains that `metacore.ts` is missing, run `cpFrontendDoJarImports`. It copies the generated file out of the `meta-core` jar.

### Verify

| Check | Expected |
|---|---|
| sbt log | `Started data: ServerBinding(/127.0.0.1:9011)`. If it says `Could not start 'data' service`, the error above it names the Postgres or RestHeart step that failed. |
| `curl http://localhost:9011/buildInfo` | Build info text. This route doesn't depend on the ENVRI. |
| http://localhost:9011/portal/ | Portal loads and shows search results (from **production** meta, see §1.1). |
| http://localhost:9011/netcdf/ | NetCDF demo viewer listing the `.nc` files from `src/test/resources/`. |
| `docker compose exec postgis psql -U postgres -d cplog -c '\dt'` | Tables `downloads`, `dobjs_extended`, … |
| `curl -s -u admin:secret http://127.0.0.1:8088/db` | Database `db` exists, with collections `users`, `portaluse`. |

Testing authenticated endpoints such as uploads: browser login won't work on `localhost`, because CP auth cookies are scoped to `.icos-cp.eu`. Instead, copy your `cpauthToken` from your profile at https://cpauth.icos-cp.eu/ and send it explicitly. Tokens are verified against the public keys bundled in `cpauth-core`.

```bash
curl -v -H "Cookie: cpauthToken=<token>" -H "Transfer-Encoding: chunked" \
  --upload-file <file> http://localhost:9011/objects/<data object id>
```

Upload permissions and metadata are looked up in your **local** meta, so the metadata package has to be registered there first.

### Lighter variant: no Docker

If you're only working on the frontend or on Scala code that doesn't touch download stats or user profiles, you can skip §4. entirely:

```hocon
cpdata {
	netcdf.folder = "./src/test/resources/"
	restheart.base.skipInit = true   # backend starts without RestHeart
	postgis.skipInit = true          # backend starts without Postgres (stats endpoints and download logging will error)
}
metacore.envriConfigs.ICOS.dataHost = "localhost"
```

## Day-to-day

In `sbt` :

```bash
cpFrontend stop          # stop the frontend watcher
reStop                   # stop the backend
```

```bash
docker compose stop      # keep data
docker compose down -v   # wipe Postgres/Mongo volumes
```

> [!CAUTION]
> `sbt clean` deletes `target/`, **including the built frontend**. Run `cpFrontend build <app>` again afterwards.
