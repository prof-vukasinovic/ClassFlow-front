FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie tout dist puis "normalise" vers /usr/share/nginx/html
COPY --from=build /app/dist/ /tmp/dist/
RUN set -eux; \
    APP_DIR="$(find /tmp/dist -maxdepth 3 -type d -name browser | head -n 1 || true)"; \
    if [ -z "$APP_DIR" ]; then APP_DIR="$(find /tmp/dist -mindepth 1 -maxdepth 1 -type d | head -n 1)"; fi; \
    rm -rf /usr/share/nginx/html/*; \
    cp -r "$APP_DIR"/* /usr/share/nginx/html/

EXPOSE 80
