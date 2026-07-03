# =============================================================================
# TeleStore Backend — Multi-stage Dockerfile
#
# Stages:
#   base       — PHP extensions + Composer (shared)
#   build      — Install all dependencies + build assets
#   production — Final production image (no dev tools, no source mounts)
# =============================================================================

# ── Stage 1: Base ────────────────────────────────────────────────────────────
FROM dunglas/frankenphp:php8.4-bookworm AS base

# System dependencies & PHP extensions
RUN install-php-extensions \
    pdo_pgsql \
    zip \
    bcmath \
    pcntl \
    redis

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM base AS build

# Layer 1: Dependencies (cached until composer.json/lock change)
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-dev --no-scripts --no-autoloader

# Layer 2: Application code
COPY . .

# Layer 3: Post-install setup
RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi \
    && php artisan storage:link \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# ── Stage 3: Production ──────────────────────────────────────────────────────
FROM dunglas/frankenphp:php8.4-bookworm AS production

# PHP extensions (same as base, but in fresh layer for minimal size)
RUN install-php-extensions \
    pdo_pgsql \
    zip \
    bcmath \
    pcntl \
    redis

WORKDIR /var/www

# Copy built application from build stage
COPY --from=build --chown=www-data:www-data /var/www /var/www

# FrankenPHP Caddy configuration for production
COPY --chown=www-data:www-data docker/Caddyfile /etc/caddy/Caddyfile

# Health check endpoint
RUN echo "<?php echo 'ok';" > public/up.php

EXPOSE 8000

# Graceful shutdown: FrankenPHP handles SIGTERM natively
# It will finish ongoing requests before exiting
STOPSIGNAL SIGTERM

CMD ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=8000"]
