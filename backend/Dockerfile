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

CMD ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=8000"]
