# Multi-stage production Dockerfile for AutoFarm
# 1. Build the React + Vite frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps

RUN pnpm install --frozen-lockfile
RUN pnpm build

# 2. Build the Go API Server
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY services/api ./services/api
WORKDIR /app/services/api
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/autofarm-api .

# 3. Final Production Runner Image
FROM alpine:3.20 AS runner
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=backend-builder /app/autofarm-api /app/autofarm-api
COPY --from=frontend-builder /app/apps/web/dist /app/static

ENV PORT=8080
ENV STATIC_DIR=/app/static
EXPOSE 8080

CMD ["/app/autofarm-api"]
