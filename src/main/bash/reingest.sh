#!/bin/bash
cat $1.txt | sed -e 's/meta/data/' | xargs -P4 -I{} curl -X POST --cookie "cpauthToken=..." {}
