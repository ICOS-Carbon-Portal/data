#!/bin/bash
cat $1.txt | sed -e 's/meta/data/' | xargs -n1 -P4 -i curl -X POST -H "Cookie: cpauthToken=..." {};\
