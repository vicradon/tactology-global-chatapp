FROM node:22

WORKDIR /frontend

COPY package.json pnpm-lock.yaml ./

RUN npm i -g pnpm && pnpm install --frozen-lockfile --prod

COPY . .

RUN pnpm build

ENV NODE_ENV=production

CMD ["pnpm", "start"]
