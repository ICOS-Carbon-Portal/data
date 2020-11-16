#!/bin/bash

# Build produktion version of each project (may include running unit tests)

# Change current directory
cd "$(dirname "$0")"

echo $'\nBuilding production version of dashboard'
cd dashboard
gulp publish

echo $'\nBuilding production version of dygraph-light'
cd ../dygraph-light
./publish.sh

echo $'\nBuilding production version of map-graph'
cd ../map-graph
./publish.sh

echo $'\nBuilding production version of netcdf'
cd ../netcdf
gulp publish

echo $'\nBuilding production version of portal'
cd ../portal
./publish.sh

echo $'\nBuilding production version of stats'
cd ../stats
gulp publish

echo $'\nBuilding production version of wdcgg'
cd ../wdcgg
gulp publish
