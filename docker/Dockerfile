# Playwright + Java (for the Allure 2 CLI) in one image.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=true HEADLESS=true
# Run tests, then always build the report (history is kept in the mounted allure-history volume).
CMD ["npm", "run", "test:report"]
