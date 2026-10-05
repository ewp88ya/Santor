#!/usr/bin/env python3
import ipaddress, json, os, subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
WG_INTERFACE="wg0"
ENDPOINT="187.126.113.168:51820"
NETWORK=ipaddress.ip_network("10.66.0.0/24")
BIND="172.16.1.1"
PORT=51821
AUTH=os.environ["PROVISIONING_KEY"]
def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)
def valid_pubkey(v):
    return isinstance(v,str) and len(v)==44 and v.endswith("=")
def valid_address(v):
    try:
        ip=ipaddress.ip_interface(v).ip
        return ip in NETWORK and ip not in (NETWORK.network_address,NETWORK.broadcast_address)
    except Exception:
        return False
def current_allowed_ips():
    return run("wg","show",WG_INTERFACE,"allowed-ips").stdout
class Handler(BaseHTTPRequestHandler):
    server_version="SantorWireGuardProvisioner/1.0"
    def send_json(self,status,payload):
        body=json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def authorized(self):
        return self.headers.get("Authorization","")==f"Bearer {AUTH}"
    def do_POST(self):
        if self.path!="/v1/peers":
            self.send_json(404,{"success":False}); return
        if not self.authorized():
            self.send_json(401,{"success":False}); return
        try:
            n=int(self.headers.get("Content-Length","0"))
            data=json.loads(self.rfile.read(n))
        except Exception:
            self.send_json(400,{"success":False}); return
        public_key=data.get("publicKey"); address=data.get("address")
        if not valid_pubkey(public_key) or not valid_address(address):
            self.send_json(400,{"success":False,"error":"invalid peer data"}); return
        allowed=current_allowed_ips()
        if public_key in allowed:
            self.send_json(409,{"success":False,"error":"peer already exists"}); return
        if address in allowed:
            self.send_json(409,{"success":False,"error":"address already in use"}); return
        try:
            run("wg","set",WG_INTERFACE,"peer",public_key,"allowed-ips",address)
            run("wg-quick","save",WG_INTERFACE)
        except subprocess.CalledProcessError:
            self.send_json(500,{"success":False}); return
        self.send_json(200,{"success":True,"publicKey":public_key,"endpoint":ENDPOINT})
    def do_DELETE(self):
        prefix="/v1/peers/"
        if not self.path.startswith(prefix):
            self.send_json(404,{"success":False}); return
        if not self.authorized():
            self.send_json(401,{"success":False}); return
        public_key=self.path[len(prefix):]
        if not valid_pubkey(public_key):
            self.send_json(400,{"success":False}); return
        try:
            run("wg","set",WG_INTERFACE,"peer",public_key,"remove")
            run("wg-quick","save",WG_INTERFACE)
        except subprocess.CalledProcessError:
            self.send_json(500,{"success":False}); return
        self.send_json(200,{"success":True})
    def do_GET(self):
        if self.path!="/health":
            self.send_json(404,{"success":False}); return
        self.send_json(200,{"status":"ok","service":"wireguard-provisioner"})
    def log_message(self,fmt,*args):
        print(fmt % args,flush=True)
ThreadingHTTPServer((BIND,PORT),Handler).serve_forever()
