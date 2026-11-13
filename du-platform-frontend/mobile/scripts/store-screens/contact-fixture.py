"""Loopback-only QA inbox. The first request receives an unconfirmed response and the second confirms the same UUID and body."""
import json
import sys
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    first = None
    def do_POST(self):
        request = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        if self.path != '/api/notifications/contact' or request['email'] != 'release-fixture@example.test':
            self.send_error(404)
            return
        uuid.UUID(request['requestId'])
        if Handler.first is None:
            Handler.first = request
            status, response = 503, {'success':False,'error':{'message':'Recovery fixture interrupted this send.'}}
        elif request == Handler.first:
            status, response = 200, {'success':True,'data':{'received':True, 'requestId':request['requestId']}}
            print('PASS isolated inbox received the exact same UUID and complete body twice',flush=True)
        else:
            status, response = 409, {'success':False,'error':{'message':'Retry changed the original request.'}}
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        body=json.dumps(response).encode()
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"success":true,"data":[]}')
    def log_message(self,*args):
        pass
HTTPServer(('127.0.0.1',int(sys.argv[1])),Handler).serve_forever()
