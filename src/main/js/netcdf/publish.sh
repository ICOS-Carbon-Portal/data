#!/bin/bash

rm -rf ./tsTarget/* ; npx tsc ; npx gulp publish
