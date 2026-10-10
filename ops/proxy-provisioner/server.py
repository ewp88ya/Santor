#!/usr/bin/env python3
import json
import os
import re
import subprocess
import socket
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

HOST = "172.16.1.1"
PORT = 51822
KEY_FILE = Path("/etc/santor-proxy/provisioning.key")
USERS_FILE = Path("/etc/santor-proxy/users.json")
XRAY_CONFIG = Path("/opt/santor/ops/xray/config.json")
XRAY_BIN = "/usr/local/bin/xray"
XRAY_CONTAINER_GID = 65532
USER_RE = re.compile(r"^[0-9a-fA-F-]{36}$")

def auth(h):
    return h.headers.get("Authorization", "") == "Bearer " + KEY_FILE.read_text().strip()

def load_users():
    if not USERS_FILE.exists():
        return []
    try:
        data = json.loads(USERS_FILE.read_text())
        return data if isinstance(data, list) else []
    except Exception:
        return []

def save_users(users):
    tmp = USERS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(users, indent=2) + "\n")
    os.chmod(tmp, 0o600)
    tmp.replace(USERS_FILE)

def render(users):
    cfg = {
        "log": {"loglevel": "warning"},
        "inbounds": [
            {
                "listen": "127.0.0.1",
                "port": 10000,
                "protocol": "vless",
                "tag": "vless-ws",
                "settings": {
                    "clients": [
                        {"id": u["uuid"], "email": u["email"]}
                        for u in users
                    ],
                    "decryption": "none"
                },
                "streamSettings": {
                    "network": "ws",
                    "wsSettings": {"path": "/xray"}
                },
                "sniffing": {
                    "enabled": True,
                    "destOverride": ["http", "tls", "quic"]
                }
            },
            {
                "listen": "127.0.0.1",
                "port": 10085,
                "protocol": "dokodemo-door",
                "settings": {"address": "127.0.0.1"},
                "tag": "api"
            }
        ],
        "api": {
            "tag": "api",
            "services": ["HandlerService", "StatsService"]
        },
        "routing": {
            "rules": [
                {"inboundTag": ["api"], "outboundTag": "api"}
            ]
        },
        "outbounds": [
            {"protocol": "freedom", "tag": "direct"},
            {"protocol": "blackhole", "tag": "blocked"}
        ]
    }
    previous_config = XRAY_CONFIG.read_bytes() if XRAY_CONFIG.exists() else None
    tmp = XRAY_CONFIG.with_suffix(".tmp")
    tmp.write_text(json.dumps(cfg, indent=2) + "\n")
    os.chown(tmp, 0, XRAY_CONTAINER_GID)
    os.chmod(tmp, 0o640)
    try:
        subprocess.run([XRAY_BIN, "run", "-test", "-config", str(tmp)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise
    tmp.replace(XRAY_CONFIG)
    try:
        subprocess.run(["docker", "exec", "santor-xray", XRAY_BIN, "run", "-test", "-config", "/etc/xray/config.json"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        subprocess.run(["docker", "restart", "santor-xray"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            try:
                with socket.create_connection(("127.0.0.1", 10000), timeout=1):
                    break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError("Xray container did not reopen its inbound listener within 30 seconds")
    except Exception:
        if previous_config is not None:
            rollback = XRAY_CONFIG.with_suffix(".rollback")
            rollback.write_bytes(previous_config)
            os.chown(rollback, 0, XRAY_CONTAINER_GID)
            os.chmod(rollback, 0o640)
            rollback.replace(XRAY_CONFIG)
            subprocess.run(["docker", "restart", "santor-xray"], check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        raise

class Handler(BaseHTTPRequestHandler):
    def send_json(self, code, payload):
        raw = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        if self.path == "/health":
            return self.send_json(200, {"ok": True})
        self.send_json(404, {"error": "not found"})
    def do_POST(self):
        if not auth(self):
            return self.send_json(401, {"error": "unauthorized"})
        if self.path != "/v1/users":
            return self.send_json(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length", "0"))
        try:
            body = json.loads(self.rfile.read(length))
            uuid = str(body["uuid"])
            email = str(body["email"])
        except Exception:
            return self.send_json(400, {"error": "invalid json"})
        if not USER_RE.match(uuid) or len(email) > 200:
            return self.send_json(400, {"error": "invalid user"})
        users = load_users()
        users = [u for u in users if u["uuid"] != uuid and u["email"] != email]
        users.append({"uuid": uuid, "email": email})
        save_users(users)
        try:
            render(users)
        except Exception as e:
            return self.send_json(500, {"error": "xray apply failed", "detail": str(e)})
        self.send_json(200, {"success": True, "uuid": uuid})
    def do_DELETE(self):
        if not auth(self):
            return self.send_json(401, {"error": "unauthorized"})
        prefix = "/v1/users/"
        if not self.path.startswith(prefix):
            return self.send_json(404, {"error": "not found"})
        uuid = unquote(self.path[len(prefix):])
        users = [u for u in load_users() if u["uuid"] != uuid]
        save_users(users)
        try:
            render(users)
        except Exception as e:
            return self.send_json(500, {"error": "xray apply failed", "detail": str(e)})
        self.send_json(200, {"success": True})

if __name__ == "__main__":
    USERS_FILE.touch(exist_ok=True)
    os.chmod(USERS_FILE, 0o600)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
