FROM nginx:1.27-alpine

COPY deployment/frontend/default.compose.conf /opt/budget-flow/default.compose.conf
COPY deployment/frontend/default.standalone.conf /opt/budget-flow/default.standalone.conf
COPY deployment/frontend/runtime-config.js.template /opt/budget-flow/runtime-config.js.template
COPY deployment/frontend/40-generate-runtime-config.sh /docker-entrypoint.d/40-generate-runtime-config.sh
COPY Budget-Flow/ /usr/share/nginx/html/
COPY Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/ /usr/share/nginx/html/app/

RUN chmod +x /docker-entrypoint.d/40-generate-runtime-config.sh

EXPOSE 80
