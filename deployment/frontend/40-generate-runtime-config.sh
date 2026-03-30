#!/bin/sh
set -eu

template="/opt/budget-flow/runtime-config.js.template"
target="/usr/share/nginx/html/runtime-config.js"
standalone_conf="/opt/budget-flow/default.standalone.conf"
compose_conf="/opt/budget-flow/default.compose.conf"
nginx_conf="/etc/nginx/conf.d/default.conf"

if [ "${ENABLE_INTERNAL_API_PROXY:-false}" = "true" ]; then
  cp "$compose_conf" "$nginx_conf"
else
  cp "$standalone_conf" "$nginx_conf"
fi

envsubst '${AUTH_API_BASE_URL} ${FEATURE_API_BASE_URL}' < "$template" > "$target"
