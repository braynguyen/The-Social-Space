# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /react-docker

COPY package.json package-lock.json ./
RUN npm ci

COPY public ./public
COPY src ./src
RUN npm run build
RUN npm install -g serve@14.2.8

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "tcp://0.0.0.0:3000"]
