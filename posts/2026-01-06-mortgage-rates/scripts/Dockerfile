FROM rust:1.83-alpine AS builder

RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

WORKDIR /app
COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

FROM alpine:latest
RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/target/release/mortgage-rates-fetcher /app/

CMD ["/app/mortgage-rates-fetcher"]
