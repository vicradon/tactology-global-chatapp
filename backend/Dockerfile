FROM node:22

WORKDIR /backend

COPY package*.json ./

RUN npm install -g @nestjs/cli
RUN npm install --omit=dev

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "npm", "run", "start:prod" ]