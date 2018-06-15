# ICOS Carbon Portal's Data Service

Data service for:

- uploading and ingesting ICOS data objects for storage and PID assignment
- searching, fetching data objects
- previewing the datasets and their metadata
- the above 3 for the [WDCGG datasets](https://data.icos-cp.eu/portal/)
- viewing lat/lon geo grid [NetCDF data](https://data.icos-cp.eu/netcdf/)
- visualizing the results of [STILT modeling](https://data.icos-cp.eu/stilt/)

---

## Instruction for uploading ICOS data objects
In HTTP protocol terms, the upload is performed by HTTP-PUTing the contents of the data object with chunked transfer encoding and cookie authentication to a URL of the form `https://data.icos-cp.eu/objects/<data object id>`, where `<data object id>` is either [base64url](https://en.wikipedia.org/wiki/Base64#URL_applications)- or hex-encoded representation of the first 18 bytes of a SHA-256 hashsum of the data object's contents. The complete 32-byte representations are also accepted. You will have obtained the data object id by the time you have completed the [first step](https://github.com/ICOS-Carbon-Portal/meta#registering-the-metadata-package) of the [2-step upload procedure](https://github.com/ICOS-Carbon-Portal/meta#data-object-registration-and-upload-instructions). The authentication cookie can be obtained from [CPauth](https://cpauth.icos-cp.eu) as described [here](https://github.com/ICOS-Carbon-Portal/meta#authentication).

For example, using the command-line tool `curl`, one can perform the upload as follows:

`curl -v -H "Transfer-Encoding: chunked" -H "Cookie: cpauthToken=<base64-encoded signed token>" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

Alternatively, if you previously logged in to CPauth with `curl` and wrote the authentication cookie to `cookies.txt`, you can run

`curl -v --cookie cookies.txt -H "Transfer-Encoding: chunked" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

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

---
## Information for developers

### Getting started with the front-end part

- Install `Node.js 5.x` as instructed [here](https://github.com/nodesource/distributions)
- Clone this repository: `git clone git@github.com:ICOS-Carbon-Portal/data.git`
- `cd data`
- Install Node.js dependencies: `npm install`
- Now you can run Gulp tasks: `npm run gulp <task>` (the list of tasks can be found in `package.json`)

### Getting started with the back-end part

- Check out the [cpauth](https://github.com/ICOS-Carbon-Portal/cpauth) project.
- Make a copy of `src/main/resources/application.conf` file in the project root and edit it to suit your environment. You only need to override the properties whose defaults are not suitable. For example, `cpdata.netcdf.folder` likely needs to be overridden. For deployment, make sure there is a relevant `application.conf` in the JVM's working directory.
- Run sbt (from this project's root)
- In the sbt console, run `~re-start` for continuous local rebuilds and server restarts
- For most of the operations (except, temporarily, the NetCDF service) you will also need [meta](https://github.com/ICOS-Carbon-Portal/meta) project running on your machine

