FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy only what's necessary first (for faster rebuilds)
COPY ./ikJawad/package*.json ./ 

# Install dependencies
RUN npm install -g pm2
RUN npm install

# Copy the rest of your application
COPY ./ikJawad .

# Start the bot
CMD ["pm2-runtime", "index.js"]
