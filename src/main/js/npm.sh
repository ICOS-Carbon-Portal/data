#!/bin/bash

displayUsage() {
	echo "Usage: npm.sh <project> <operation>"
	echo ""
	echo "project is one of 'dashboard', 'dygraph-light', 'map-graph', 'netcdf', 'portal', and 'stats'."
	echo ""
	echo "operation is one of 'update', 'build' and 'install'."
	echo "update: Update installed npm packages and attempt to fix security problems."
	echo "build: Build the production version of app. This may include running tests."
	echo "install: Install npm packages from packages-lock.json. This will empty folder node_modules before installation."
}

PROJECT=$1
OPERATION=$2

runOperation() {
	case "$OPERATION" in
		update)
			update;;
		build)
			build;;
		install)
			install;;
	esac
}

update() {
	npm --prefix "$PROJECT" update
	npm --prefix "$PROJECT" audit fix --package-lock-only
	install
}

build() {
	echo $"Building production version of $PROJECT"
	cd $PROJECT
	case "$PROJECT" in
		dashboard|netcdf|stats)
			gulp publish;;
		*)
			./publish.sh;;
	esac
}

install() {
	npm --prefix "$PROJECT" ci
}

if [[ -z "$PROJECT" || -z "$OPERATION" ]]; then
	displayUsage
	exit 1
fi

case "$PROJECT" in
	dashboard|dygraph-light|map-graph|netcdf|portal|stats)
		case "$OPERATION" in
			update|build|install)
				cd "$(dirname "$0")"
				runOperation
				;;
			*)
				displayUsage
				exit 1
				;;
		esac
		;;
	*)
		displayUsage
		exit 1
		;;
esac
