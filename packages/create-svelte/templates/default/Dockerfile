FROM docker.io/node:14 as build

WORKDIR /app

COPY package*.json .
RUN npm install

COPY . .

# Pass --host flag to expose the server from container to host
CMD ["npm", "run", "dev", "--", "--host"]
