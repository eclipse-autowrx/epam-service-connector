#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Installing dependencies...${NC}"
npm install

echo -e "${GREEN}Building plugin...${NC}"

# Build with esbuild
npx esbuild src/index.ts \
  --bundle \
  --format=iife \
  --platform=browser \
  --jsx=automatic \
  --external:react \
  --external:react-dom \
  --external:react-dom/client \
  --sourcemap \
  --outfile=index.js

echo -e "${GREEN}Build complete: index.js${NC}"
ls -lh index.js
