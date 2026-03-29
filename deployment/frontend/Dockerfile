FROM nginx:1.27-alpine

COPY deployment/frontend/default.conf /etc/nginx/conf.d/default.conf
COPY Budget-Flow/ /usr/share/nginx/html/
COPY Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/ /usr/share/nginx/html/app/

EXPOSE 80
