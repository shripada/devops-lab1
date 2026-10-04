# start with the base image. node:20
FROM node:20
# set /app as the working directory
WORKDIR /app

# install dependencies first, this is a separate step so that docker can cache the installed dependencies
COPY package.json package-lock.json ./
RUN npm ci

# copy everything from the current directory to /app in the container
COPY . . 

# invoke build npm script
RUN npm run build
# document port 3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail --silent --show-error http://127.0.0.1:3000/health || exit 1
  
CMD ["node", "dist/server.js"]