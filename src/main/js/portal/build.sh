#!/bin/bash

rm -rf ./tsTarget/* ; npx tsc ; npx tsc --watch & gulp buildWatch
