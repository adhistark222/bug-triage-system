FROM php:8.4-cli

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpq-dev \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_pgsql

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

EXPOSE 8000