FROM nginx:1.27-alpine

COPY deployment/frontend/default.conf /etc/nginx/conf.d/default.conf
COPY deployment/frontend/runtime-config.js.template /opt/budget-flow/runtime-config.js.template
COPY deployment/frontend/40-generate-runtime-config.sh /docker-entrypoint.d/40-generate-runtime-config.sh
COPY Budget-Flow/ /usr/share/nginx/html/
COPY Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/ /usr/share/nginx/html/app/

RUN chmod +x /docker-entrypoint.d/40-generate-runtime-config.sh

EXPOSE 80
