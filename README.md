ICOS Carbon Portal's Data Service
===================================

Data service for:
- viewing lat/lon geo grid NetCDF data
- uploading data files for storage and PID assignment

The latter feature is under development.

Getting started with the front-end part
---------------------------------------
- Install `Node.js` as instructed [here](https://github.com/nodesource/distributions)
- Clone this repository: `git clone git@github.com:ICOS-Carbon-Portal/data.git`
- `cd data`
- Install Node.js dependencies: `npm install`
- Now you can run Gulp tasks: `npm run gulp <task>`

Getting started with the back-end part
--------------------------------------
- Check out the [cpauth](https://github.com/ICOS-Carbon-Portal/cpauth) project, run `sbt` from its root, switch to `cpauthCore` subproject, and run `publishLocal` in sbt console to publish the `cpauth-core` artifact to your local Ivy repository. It is needed as a dependency for this project.
- Make a copy of `src/main/resources/application.conf` file in the project root and edit it to suit your environment. You only need to override the properties whose defaults are not suitable. For example, `cpdata.netcdf.folder` likely needs to be overridden. For deployment, make sure there is a relevant `application.conf` in the JVM's working directory.
- Run sbt (from this project's root)
- In the sbt console, run `~re-start` for continuous local rebuilds and server restarts

Using the data upload functionality
-----------------------------------
Upload is done using HTTP PUT with chunked transfer encoding and cookie authentication. The cookie can be obtained from https://cpauth.icos-cp.eu .

`curl -v -H "Transfer-Encoding: chunked" -H "Cookie: cpauthToken=<base64-encoded signed token>" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

Alternatively, if you previously logged in to CPauth with `curl` and wrote the authentication cookie to `cookies.txt`, you can run

`curl -v --cookie cookies.txt -H "Transfer-Encoding: chunked" --upload-file <file> https://data.icos-cp.eu/objects/<data object id>`

