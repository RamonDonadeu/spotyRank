# syntax=docker/dockerfile:1

# --- Build: compile Vite SPA (VITE_* baked in at build time) ---
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SPOTIFY_CLIENT_ID
ARG VITE_SPOTIFY_REDIRECT_URI
ARG VITE_SPOTIFY_MOCK

ENV VITE_SPOTIFY_CLIENT_ID=$VITE_SPOTIFY_CLIENT_ID
ENV VITE_SPOTIFY_REDIRECT_URI=$VITE_SPOTIFY_REDIRECT_URI
ENV VITE_SPOTIFY_MOCK=$VITE_SPOTIFY_MOCK

RUN npm run build

# --- Production: unprivileged nginx serves static dist ---
FROM nginxinc/nginx-unprivileged:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
