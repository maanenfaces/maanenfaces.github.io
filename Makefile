# Default Shell to use
SHELL := /bin/bash

# Absolute path of the directory of this script
root_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

serve:
	docker run --rm \
	  --volume="$(root_dir):/srv/jekyll:Z" \
	  --publish 4000:4000 \
	  jekyll/jekyll \
	  jekyll serve --trace
