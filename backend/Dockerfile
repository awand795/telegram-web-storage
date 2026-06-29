FROM php:8.4-cli-alpine AS base

# System dependencies
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    unzip \
    curl \
    && docker-php-ext-install pdo_pgsql zip bcmath

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

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

EXPOSE 8000

# APP_KEY must be set via environment variable or .env
CMD ["php", "artisan", "octane:start", "--server=swoole", "--host=0.0.0.0", "--port=8000"]
