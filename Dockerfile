FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Install without needing package-lock.json
RUN npm install --production
COPY . .
RUN npm run build
CMD ["node", "dist/agent.js"]
