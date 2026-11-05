FROM criyle/go-judge:v1.13.3 AS go-judge

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      gcc g++ python3 default-jdk-headless \
    && rm -rf /var/lib/apt/lists/*
COPY --from=go-judge /opt/go-judge /opt/mount.yaml /opt/
WORKDIR /opt
EXPOSE 5050
ENTRYPOINT ["/opt/go-judge"]
