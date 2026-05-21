FROM node:18-alpine

WORKDIR /app

# Install git and ssh for simple-git operations
RUN apk add --no-cache git openssh-client

COPY package.json package-lock.json* ./

RUN npm install --production

COPY . .

# Create volume directories
RUN mkdir -p /app/repositories

EXPOSE 5000

CMD ["node", "server.js"]
