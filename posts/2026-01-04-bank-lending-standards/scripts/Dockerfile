FROM rust:1.83-alpine

RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

WORKDIR /app

COPY Cargo.toml ./
COPY src ./src

RUN cargo build --release

CMD ["./target/release/lending-standards-fetcher"]
