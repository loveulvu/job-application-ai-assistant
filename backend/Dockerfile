FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o server .

FROM golang:1.26-alpine

WORKDIR /app

COPY --from=builder /app/server ./server

EXPOSE 8083

CMD ["./server"]