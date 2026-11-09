FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Staging redirects APK downloads and avoids fetching a large release asset
# during the Render Docker build. Production continues to bundle its APK.
ARG DFY_DEPLOY_ENV=staging
ARG DFY_MOBILE_APK_URL=https://github.com/DoForYou-ZA/dfy-mobile/releases/download/mobile-staging-branch-latest/dfy-mobile.apk
ARG VITE_API_URL
ARG VITE_SIGNALR_URL
ARG VITE_APP_NAME=DoForYou
ARG VITE_GOOGLE_CLIENT_ID

RUN if [ "$DFY_DEPLOY_ENV" = "production" ]; then \
      case "$VITE_API_URL" in https://dfy-be-production.onrender.com/api/v1) ;; *) echo "Production build requires VITE_API_URL=https://dfy-be-production.onrender.com/api/v1" >&2; exit 1 ;; esac; \
      case "$DFY_MOBILE_APK_URL" in https://github.com/DoForYou-ZA/dfy-mobile/releases/latest/download/dfy-mobile.apk) ;; *) echo "Production build requires the latest production APK release URL" >&2; exit 1 ;; esac; \
      case "$VITE_SIGNALR_URL" in https://dfy-be-production.onrender.com*) ;; *) echo "Production build requires the production SignalR host" >&2; exit 1 ;; esac; \
    fi

RUN mkdir -p public/downloads \
    && if [ "$DFY_DEPLOY_ENV" = "production" ]; then \
         apk add --no-cache curl \
         && curl --fail --location --retry 3 --connect-timeout 15 --max-time 180 \
           --output public/downloads/dfy-mobile.apk \
           "$DFY_MOBILE_APK_URL" \
         && test -s public/downloads/dfy-mobile.apk; \
       else \
         echo "Staging APK download is redirected by Nginx; skipping build-time asset download"; \
       fi

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SIGNALR_URL=$VITE_SIGNALR_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM nginx:alpine
ARG DFY_DEPLOY_ENV=staging
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-staging.conf /etc/nginx/conf.d/nginx-staging.conf
RUN if [ "$DFY_DEPLOY_ENV" = "staging" ]; then \
      cp /etc/nginx/conf.d/nginx-staging.conf /etc/nginx/conf.d/default.conf; \
    fi \
    && rm -f /etc/nginx/conf.d/nginx-staging.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
