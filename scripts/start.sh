#!/bin/bash
cd "$(dirname "$0")"

java -jar "assembly.jar" >> sdout.log &

echo $! > pid
