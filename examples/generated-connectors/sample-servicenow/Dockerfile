FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 4300
CMD ["npm", "start"]
