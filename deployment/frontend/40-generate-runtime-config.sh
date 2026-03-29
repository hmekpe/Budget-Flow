#!/bin/sh
set -eu

template="/opt/budget-flow/runtime-config.js.template"
target="/usr/share/nginx/html/runtime-config.js"

envsubst '${AUTH_API_BASE_URL} ${FEATURE_API_BASE_URL}' < "$template" > "$target"
