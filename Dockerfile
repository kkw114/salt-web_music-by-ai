FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

ENV MUSIC_DIR=/music

CMD ["node", "server.js"]
