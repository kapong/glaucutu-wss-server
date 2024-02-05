FROM node:current-alpine

RUN mkdir -p /app
WORKDIR /app

COPY package.json /app/
RUN npm install

COPY *.js /app/

EXPOSE 3000

CMD ["node", "index.js"]