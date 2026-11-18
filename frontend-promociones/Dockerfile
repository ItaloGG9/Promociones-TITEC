
# Usar Node.js para ejecutar Next.js
FROM node:20-alpine

# Carpeta de trabajo del contenedor
WORKDIR /app

# Copiar e instalar las dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código del frontend
COPY . .

# Configurar la dirección interna del API Gateway
ARG API_GATEWAY_URL
ENV API_GATEWAY_URL=${API_GATEWAY_URL}

# Configurar el evento que mostrará el frontend
ARG NEXT_PUBLIC_EVENTO_ID=evt-demo
ENV NEXT_PUBLIC_EVENTO_ID=${NEXT_PUBLIC_EVENTO_ID}

# Construir el frontend
RUN npm run build

# Puerto interno de Next.js
EXPOSE 3000

# Iniciar el frontend
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]