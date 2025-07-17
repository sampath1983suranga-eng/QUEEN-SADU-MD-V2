# Use official Node.js LTS base image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install -g pm2
RUN npm install

# Copy all source code
COPY . .

# Start the app using pm2
CMD ["pm2-runtime", "index.js"]
