#!/bin/bash
cat dobjsToReingest.txt | sed -e 's/meta/data/' | xargs -i curl -X POST -H "Cookie: cpauthToken=..." {};\
