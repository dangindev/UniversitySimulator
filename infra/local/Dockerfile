FROM node:24.14.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends g++ python3 coreutils \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 65532 --no-create-home --shell /usr/sbin/nologin usim
COPY runner.py /opt/usim/runner.py
COPY sql_runner.py /opt/usim/sql_runner.py
RUN chmod 0555 /opt/usim/runner.py /opt/usim/sql_runner.py
USER 65532:65532
WORKDIR /work
ENTRYPOINT ["/usr/bin/python3","-I","/opt/usim/runner.py"]
