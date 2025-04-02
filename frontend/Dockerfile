FROM node:22

WORKDIR /frontend

COPY package.json pnpm-lock.yaml ./

RUN npm i -g pnpm && pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

RUN pnpm build

CMD ["pnpm", "start"]
