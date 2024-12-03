# Default Shell to use
SHELL := /bin/bash

# Absolute path of the directory of this script
root_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

serve:
	docker run --rm \
	  --env GEM_HOME=/srv/jekyll/.jekyll-cache/gemfiles \
	  --publish 4000:4000 \
	  --volume="$(root_dir):/srv/jekyll:Z" \
	  jekyll/jekyll \
	  jekyll serve --trace
