#!/bin/bash

# This might break code! Run buildApps.sh when done to verify

# Update from packages.json (assumes packages are defined with "^" for version),
# attempt to fix security problems and then do a clean installation with 'npm ci' (removes folder node_modules before installing)

# Change current directory and use 'npm --prefix' to access each project
cd "$(dirname "$0")"

npm --prefix common update
npm --prefix common audit fix --package-lock-only
npm --prefix common ci

npm --prefix dashboard update
npm --prefix dashboard audit fix --package-lock-only
npm --prefix dashboard ci

npm --prefix dygraph-light update
npm --prefix dygraph-light audit fix --package-lock-only
npm --prefix dygraph-light ci

npm --prefix map-graph update
npm --prefix map-graph audit fix --package-lock-only
npm --prefix map-graph ci

npm --prefix netcdf update
npm --prefix netcdf audit fix --package-lock-only
npm --prefix netcdf ci

npm --prefix portal update
npm --prefix portal audit fix --package-lock-only
npm --prefix portal ci

npm --prefix stats update
npm --prefix stats audit fix --package-lock-only
npm --prefix stats ci

npm --prefix wdcgg update
npm --prefix wdcgg audit fix --package-lock-only
npm --prefix wdcgg ci
