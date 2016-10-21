#ICOS Carbon Portal's Data Service

Data service for:

- uploading and ingesting ICOS data objects for storage and PID assignment
- searching, fetching data objects
- previewing the datasets and their metadata
- the above 3 for the [WDCGG datasets](https://data.icos-cp.eu/portal/)
- viewing lat/lon geo grid [NetCDF data](https://data.icos-cp.eu/netcdf/)
- visualizing the results of [STILT modeling](https://data.icos-cp.eu/stilt/)

---

##Instruction for uploading ICOS data objects
In HTTP protocol terms, the upload is performed by HTTP-PUTing the contents of the data object with chunked transfer encoding and cookie authentication to a URL of the form `https://data.icos-cp.eu/objects/<data object id>`, where `<data object id>` is either [base64url](https://en.wikipedia.org/wiki/Base64#URL_applications)- or hex-encoded representation of the first 18 bytes of a SHA-256 hashsum of the data object's contents. The complete 32-byte representations are also accepted. You will have obtained the data object id by the time you have completed the [first step](https://github.com/ICOS-Carbon-Portal/meta#registering-the-metadata-package) of the [2-step upload procedure](https://github.com/ICOS-Carbon-Portal/meta#data-object-registration-and-upload-instructions). The authentication cookie can be obtained from [CPauth](https://cpauth.icos-cp.eu) as described [here](https://github.com/ICOS-Carbon-Portal/meta#authentication).

For example, using the command-line tool `curl`, one can perform the upload as follows:

`curl -v -H "Transfer-Encoding: chunked" -H "Cookie: cpauthToken=<base64-encoded signed token>" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

Alternatively, if you previously logged in to CPauth with `curl` and wrote the authentication cookie to `cookies.txt`, you can run

`curl -v --cookie cookies.txt -H "Transfer-Encoding: chunked" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

---

## Simplified ETC-specific facade API for data uploads
A test service is available for developers of the client code. At the time of writing, the test service uses Basic HTTP Authentication with a fixed username `station` and password `p4ssw0rd`. The uploaded data is analyzed (MD5 sum gets calculated for it), and then discarded. Here is an example of uploading bytes in the string `test` to the service (performed on Linux command line):

`$ echo -n 'test' | md5sum`

`098f6bcd4621d373cade4e832627b4f6  -`

`$ curl -X PUT --data 'test' https://station:p4ssw0rd@data.icos-cp.eu/upload/etc/098f6bcd4621d373cade4e832627b4f6/testFileName.txt`

`OK`

To upload a file from the command line:

`$ md5sum myfile.ext`

`098f6bcd4621d373cade4e832627b4f6  -`

`$ curl --upload-file myfile.ext https://station:p4ssw0rd@data.icos-cp.eu/upload/etc/098f6bcd4621d373cade4e832627b4f6/myfile.ext`

`OK`

---
## Information for developers

###Getting started with the front-end part

- Install `Node.js 5.x` as instructed [here](https://github.com/nodesource/distributions)
- Clone this repository: `git clone git@github.com:ICOS-Carbon-Portal/data.git`
- `cd data`
- Install Node.js dependencies: `npm install`
- Now you can run Gulp tasks: `npm run gulp <task>` (the list of tasks can be found in `package.json`)

###Getting started with the back-end part

- Check out the [cpauth](https://github.com/ICOS-Carbon-Portal/cpauth) project.
- Make a copy of `src/main/resources/application.conf` file in the project root and edit it to suit your environment. You only need to override the properties whose defaults are not suitable. For example, `cpdata.netcdf.folder` likely needs to be overridden. For deployment, make sure there is a relevant `application.conf` in the JVM's working directory.
- Run sbt (from this project's root)
- In the sbt console, run `~re-start` for continuous local rebuilds and server restarts
- For most of the operations (except, temporarily, the NetCDF service) you will also need [meta](https://github.com/ICOS-Carbon-Portal/meta) project running on your machine

