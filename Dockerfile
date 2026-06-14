FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public

RUN mkdir -p /app/data

ENV HOST=0.0.0.0
ENV PORT=3100

EXPOSE 3100

CMD ["npm", "start"]
