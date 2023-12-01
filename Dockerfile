FROM node:20-alpine

ARG MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}

WORKDIR /src
COPY . .
RUN yarn install

CMD ["node", "src/main.js"]
