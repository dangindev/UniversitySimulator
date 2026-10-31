# Build this image into a versioned E2B template. No network is allowed at execution time.
# Record the resolved image digest and runtime versions with the reviewed assessment bank.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates g++ python3 nodejs sqlite3 coreutils \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home user
USER user
WORKDIR /home/user
