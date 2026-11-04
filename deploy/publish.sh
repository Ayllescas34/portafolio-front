#!/usr/bin/env bash
# Builds the site and publishes it to S3 and CloudFront.
#   SITE_BUCKET=nombre DISTRIBUTION_ID=id bash deploy/publish.sh
set -euo pipefail

: "${SITE_BUCKET:?Falta SITE_BUCKET}"
: "${DISTRIBUTION_ID:?Falta DISTRIBUTION_ID}"

npm run build
output=dist/frontend/browser

# Files with a hash in their name never change: they can stay cached for a year.
aws s3 sync "$output" "s3://$SITE_BUCKET" --delete --only-show-errors \
  --exclude '*' --include 'chunk-*.js' --include 'main-*.js' --include 'polyfills-*.js' \
  --include 'styles-*.css' --include 'media/*' \
  --cache-control 'public,max-age=31536000,immutable'

# The rest must be revalidated, so a new release is visible right away.
aws s3 sync "$output" "s3://$SITE_BUCKET" --only-show-errors \
  --exclude 'chunk-*.js' --exclude 'main-*.js' --exclude 'polyfills-*.js' \
  --exclude 'styles-*.css' --exclude 'media/*' \
  --cache-control 'no-cache'

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*' \
  --query 'Invalidation.Id' --output text
echo 'Sitio publicado.'
