FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install && npm test
EXPOSE 4300
CMD ["npm","run","dev"]
