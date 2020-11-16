#!/bin/bash

# This should be a completely safe operation

# Install packages from packages-lock.json in each project
# 'npm ci' removes folder node_modules before installing

# Change current directory and use 'npm --prefix' to access each project
cd "$(dirname "$0")"

npm --prefix common ci
npm --prefix dashboard ci
npm --prefix dygraph-light ci
npm --prefix map-graph ci
npm --prefix netcdf ci
npm --prefix portal ci
npm --prefix stats ci
npm --prefix wdcgg ci
