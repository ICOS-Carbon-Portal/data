# ICOS Carbon Portal's Data Service

Data service for:

- uploading and ingesting ICOS data objects for storage and PID assignment
- searching, fetching data objects
- previewing the datasets and their metadata
- viewing lat/lon geo grid [NetCDF data](https://data.icos-cp.eu/netcdf/)

---

## Instruction for uploading ICOS data objects

In HTTP protocol terms, the upload is performed by HTTP-PUTing the contents of the data object with chunked transfer encoding and cookie authentication to a URL of the form `https://data.icos-cp.eu/objects/<data object id>`, where `<data object id>` is either [base64url](https://en.wikipedia.org/wiki/Base64#URL_applications)- or hex-encoded representation of the first 18 bytes of a SHA-256 hashsum of the data object's contents. The complete 32-byte representations are also accepted. You will have obtained the data object id by the time you have completed the [first step](https://github.com/ICOS-Carbon-Portal/meta#registering-the-metadata-package) of the [2-step upload procedure](https://github.com/ICOS-Carbon-Portal/meta#data-object-registration-and-upload-instructions). The authentication cookie can be obtained from [CPauth](https://cpauth.icos-cp.eu) as described [here](https://github.com/ICOS-Carbon-Portal/meta#authentication).

For example, using the command-line tool `curl`, one can perform the upload as follows:

`curl -v -H "Transfer-Encoding: chunked" -H "Cookie: cpauthToken=<base64-encoded signed token>" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

Alternatively, if you previously logged in to CPauth with `curl` and wrote the authentication cookie to `cookies.txt`, you can run

`curl -v --cookie cookies.txt -H "Transfer-Encoding: chunked" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

### Trying ingestion

When developing client code for data upload, one may wish to test data objects for compliance with a certain format, to be sure that upload will work for a certain exact binary version of a data object. This is useful to avoid registering metadata packages for invalid data objects. The API is available through (similar to the standard upload) HTTP PUTing the data object contents to URL of the form

`https://data.icos-cp.eu/tryingest?specUri=<obj spec uri>&nRows=<number of rows>` (for tabular data), or

`https://data.icos-cp.eu/tryingest?specUri=<obj spec uri>&varnames=<variable names>` (for spatial NetCDF data), where

- `specUri` is URL-encoded URL of the planned object specification ([examples](https://meta.icos-cp.eu/ontologies/cpmeta/SimpleObjectSpec))
- `nRows` is the number of rows in the time series (not needed for ATC and WDCGG files)
- `varnames` is URL-encoded JSON array with names of the variables that are expected to be previewable

With curl, the test can be performed for example as follows:

```bash
curl -G --data-urlencode "specUri=http://meta.icos-cp.eu/resources/cpmeta/atcMtoL2DataObject" \
--upload-file ICOS_ATC_NRT_MTO.zip https://data.icos-cp.eu/tryingest
```

or

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

The APIs described above are HTTP-based and programming language agnostic, therefore can be used from arbitrary programming language. For Python users, there exists a [dedicated library](https://icos-carbon-portal.github.io/pylib/) that provides a high-level API for Carbon Portal data and metadata access.

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

The features and functional principles of the facade are described in more detail in [source code comments](https://github.com/ICOS-Carbon-Portal/data/blob/master/src/main/scala/se/lu/nateko/cp/data/services/etcfacade/FacadeService.scala#L40)

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

Please note that Eddy flux files (EC data type), being half-hourly rather than daily, are treated specially. They are not uploaded by the facade to CP immediately. Instead, they are kept in the staging area until a complete daily set (for certain station, logger id, and file id) has been uploaded. After that, the daily file set gets zip-archived and uploaded to CP as a single data object with a time-stripped filename. Additionally, there exists a deadline time of day (04:00 UTC at the time of writing) when even incomplete daily sets are packaged and uploaded.

To observe the effect of the FA-Lso upload on the Carbon Portal metadata, you can inspect search results in the [portal](https://data.icos-cp.eu/portal/#search?station=%5B%22Test%20station%20(fake)%22%5D) webapp.

(Alternatively, you can visit the Carbon Portal "landing page" of the fake station [FA-Lso](http://meta.icos-cp.eu/resources/stations/ES_FA-Lso) and observe changes in the "Usages of this Resource by others" section.
Upload of every new file (provided that the file content is unique!) will result in creation of two new html links there, one for the acquisition provenance object, and one for the submission provenance object.
You can reach the landing page of your newly uploaded data object in two clicks: 1) one of the newly created links; 2) the landing page link in the "Usages..." section.)

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

### Getting started with the front-end part

- Install `Node.js 8.x` as instructed [here](https://github.com/nodesource/distributions)
- Clone this repository: `git clone git@github.com:ICOS-Carbon-Portal/data.git`
- `cd data`
- Run sbt
- In the sbt console, run `frontend` to list the apps available
- Run `~frontend build <jsApp>` for continuous build of the app

### Getting started with the back-end part

- Check out the [data](https://github.com/ICOS-Carbon-Portal/data) project.
- Make a copy of `src/main/resources/application.conf` file in the project root and edit it to suit your environment. You only need to override the properties whose defaults are not suitable. For example, `cpdata.netcdf.folder` likely needs to be overridden. For deployment, make sure there is a relevant `application.conf` in the JVM's working directory.
- Run sbt (from this project's root)
- In the sbt console, run `~re-start` for continuous local rebuilds and server restarts
- For most of the operations (except, temporarily, the NetCDF service) you will also need [meta](https://github.com/ICOS-Carbon-Portal/meta) project running on your machine
