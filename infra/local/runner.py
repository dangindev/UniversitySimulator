"""Trusted supervisor inside a disposable, restricted Linux container.

Only source and ONE test input enter this container. Expected outputs remain in Node.
The application never executes learner code on the host.
"""
import base64
import json
import os
import resource
import signal
import subprocess
import sys
import tempfile

OUTPUT_LIMIT = 8192
DIAGNOSTIC_LIMIT = 2048


def emit(status, output=b"", diagnostic="", exit_code=0):
    print(json.dumps({"protocol": 1, "status": status, "output": base64.b64encode(output[:OUTPUT_LIMIT]).decode("ascii"), "diagnostic": diagnostic[:DIAGNOSTIC_LIMIT]}, separators=(",", ":")), flush=True)
    raise SystemExit(exit_code)


if len(sys.argv) == 2 and sys.argv[1] == "--probe":
    versions = {}
    for name, command in {"cpp": ["/usr/bin/g++", "--version"], "python": ["/usr/bin/python3", "--version"], "javascript": ["/usr/local/bin/node", "--version"]}.items():
        versions[name] = subprocess.check_output(command, timeout=3, stderr=subprocess.STDOUT).decode("utf-8", "replace").splitlines()[0][:160]
    print(json.dumps({"protocol": 1, "runtimes": versions, "uid": os.getuid()}), flush=True)
    raise SystemExit(0)


def limits(compiling=False, javascript=False):
    os.setsid()
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))
    resource.setrlimit(resource.RLIMIT_FSIZE, ((16 * 1024 * 1024) if compiling else OUTPUT_LIMIT,) * 2)
    resource.setrlimit(resource.RLIMIT_CPU, (10, 11) if compiling else (2, 3))
    if not javascript:
        memory = (384 if compiling else 256) * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (memory, memory))


def run(command, input_bytes=b"", compiling=False, javascript=False):
    # Anonymous regular file descriptors cannot be replaced with a symlink/FIFO by learner code.
    with tempfile.TemporaryFile(dir="/work") as output, tempfile.TemporaryFile(dir="/work") as errors:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=output, stderr=errors, cwd="/work", close_fds=True,
                                   env={"PATH": "/usr/local/bin:/usr/bin:/bin", "HOME": "/work", "LANG": "C.UTF-8"},
                                   preexec_fn=lambda: limits(compiling, javascript))
        timed_out = False
        try:
            process.communicate(input=input_bytes, timeout=12 if compiling else 3)
        except subprocess.TimeoutExpired:
            timed_out = True
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.wait(timeout=2)
        output_size = os.fstat(output.fileno()).st_size
        errors_size = os.fstat(errors.fileno()).st_size
        output.seek(0)
        errors.seek(0)
        return process.returncode, output.read(OUTPUT_LIMIT), errors.read(DIAGNOSTIC_LIMIT).decode("utf-8", "replace"), timed_out, output_size >= OUTPUT_LIMIT or errors_size >= OUTPUT_LIMIT


try:
    raw = sys.stdin.buffer.read(512 * 1024 + 1)
    if len(raw) > 512 * 1024:
        emit("runtime-error", diagnostic="Dữ liệu bài chạy vượt giới hạn.", exit_code=1)
    payload = json.loads(raw)
    language, source, test_input = payload["language"], payload["source"], payload["input"]
    if language not in ("cpp", "python", "javascript", "sql") or not isinstance(source, str) or not isinstance(test_input, str) or len(source) > 64000 or len(test_input.encode("utf-8")) > 65536:
        emit("runtime-error", diagnostic="Mã nguồn hoặc dữ liệu vào không hợp lệ.", exit_code=1)
    extension = {"cpp": "cpp", "python": "py", "javascript": "js", "sql": "sql"}[language]
    path = "/work/main." + extension
    with open(path, "x", encoding="utf-8") as program:
        program.write(source)
    if language == "cpp":
        code, _, diagnostic, timed_out, _ = run(["/usr/bin/g++", "-std=c++20", "-O1", "-pipe", path, "-o", "/work/main"], compiling=True)
        if timed_out:
            emit("time-limit", diagnostic="Biên dịch vượt thời gian cho phép.", exit_code=1)
        if code:
            emit("compile-error", diagnostic=diagnostic or "Không biên dịch được chương trình C++.", exit_code=1)
    commands = {"cpp": ["/work/main"], "python": ["/usr/bin/python3", "-I", path], "javascript": ["/usr/local/bin/node", "--max-old-space-size=64", path], "sql": ["/usr/bin/python3", "-I", "/opt/usim/sql_runner.py"]}
    code, output, diagnostic, timed_out, exceeded = run(commands[language], test_input.encode("utf-8"), javascript=language == "javascript")
    if timed_out or code == -signal.SIGXCPU:
        emit("time-limit", diagnostic="Chương trình vượt thời gian cho mỗi kiểm thử.", exit_code=1)
    if exceeded or code == -signal.SIGXFSZ:
        emit("output-limit", diagnostic="Đầu ra vượt giới hạn 8 KiB.", exit_code=1)
    if code:
        emit("runtime-error", diagnostic=diagnostic or "Chương trình kết thúc với lỗi hoặc vượt giới hạn tài nguyên.", exit_code=1)
    emit("ok", output=output)
except SystemExit:
    raise
except Exception:
    emit("runtime-error", diagnostic="Không thể chạy tác vụ trong môi trường giới hạn.", exit_code=1)
