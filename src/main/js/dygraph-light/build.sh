#!/bin/bash

rm -rf ./tsTarget/*

npx tsc
npx tsc --watch &
npx gulp buildWatch 2>&1

echo '"gulp buildWatch" has exited. Build script is waiting for termination.'
sleep inf
