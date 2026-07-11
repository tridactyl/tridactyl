#!/bin/sh
cd "${0%/*}"/.. || exit 1
if [ -x "$(command -v shellcheck)" ]; then
	GLOBIGNORE="node_modules" shellcheck -e2012 ./**/*.sh
else
	echo "Warning: shellcheck is not installed, skipping shell scripts"
fi
incompatible_sed=$(! grep -RPn --color=always --exclude-dir=node_modules --exclude-dir=.git 'sed(?:\s-\w+)*\s-i(?!\S|\s"")')
if [ "$incompatible_sed" ]; then
	printf "\nWarning: avoid non-portable sed flag -i without backup extension, use -i.bak\n"
	printf "%s\n\n" "$incompatible_sed"
fi
yarn run lint
"$(yarn bin)/eslint" --rulesdir custom-eslint-rules --report-unused-disable-directives --ext .ts .

if [ "$(git rev-parse --abbrev-ref HEAD)" = "master" ]; then
	if ! yarn prettier --check '**/*.ts' ; then
		echo "Warning: the files above have prettier formatting issues. Run 'yarn run prettier -w [files]' to fix them."
	fi
else
	git fetch origin master 2>/dev/null || true
	changed=$(git diff --name-only origin/master...HEAD -- '*.ts' 2>/dev/null || true)
	if [ -n "$changed" ]; then
		if ! yarn prettier --check $changed; then
			echo "The files above have prettier formatting issues. Run 'yarn run prettier -w [files]' to fix them."
			exit 1
		fi
	fi
fi
