#!/bin/bash
cd "$(dirname "$0")"

if [ -f pid ];
then
	kill `cat pid`
fi

