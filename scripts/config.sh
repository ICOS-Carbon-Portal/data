#!/bin/bash

host="fsicos.lunarc.lu.se"
deployPath="/usr/share/cpdata/"

if [[ -n "$1" ]]; then host="$1@$host"; fi # prepending user name if specified

