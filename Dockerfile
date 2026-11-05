FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Keep staging downloads as the default. Production must opt in explicitly and
# use the latest versioned production APK release asset.
ARG DFY_DEPLOY_ENV=staging
ARG DFY_MOBILE_APK_URL=https://github.com/DoForYou-ZA/dfy-mobile/releases/download/mobile-staging-latest/dfy-mobile.apk
ARG VITE_API_URL
ARG VITE_SIGNALR_URL
ARG VITE_APP_NAME=DoForYou

RUN if [ "$DFY_DEPLOY_ENV" = "production" ]; then \
      case "$VITE_API_URL" in https://dfy-be-production.onrender.com/api/v1) ;; *) echo "Production build requires VITE_API_URL=https://dfy-be-production.onrender.com/api/v1" >&2; exit 1 ;; esac; \
      case "$DFY_MOBILE_APK_URL" in https://github.com/DoForYou-ZA/dfy-mobile/releases/latest/download/dfy-mobile.apk) ;; *) echo "Production build requires the latest production APK release URL" >&2; exit 1 ;; esac; \
      case "$VITE_SIGNALR_URL" in https://dfy-be-production.onrender.com*) ;; *) echo "Production build requires the production SignalR host" >&2; exit 1 ;; esac; \
    fi

RUN apk add --no-cache curl \
    && mkdir -p public/downloads \
    && curl --fail --location --retry 3 --connect-timeout 15 --max-time 180 \
      --output public/downloads/dfy-mobile.apk \
      "$DFY_MOBILE_APK_URL" \
    && test -s public/downloads/dfy-mobile.apk

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SIGNALR_URL=$VITE_SIGNALR_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
