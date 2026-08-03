FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json .
COPY index.js .
EXPOSE 3000
CMD ["node", "index.js"]