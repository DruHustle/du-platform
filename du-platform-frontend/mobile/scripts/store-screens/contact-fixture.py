"""Loopback-only QA inbox. The first request receives an unconfirmed response and the second confirms the same UUID and body."""
import json
import sys
import uuid
import urllib.request
import urllib.error
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    first = None
    def forward_public(self, method, body=None):
        by_method={'GET':{'/api/travel/capabilities'},'POST':{'/api/travel/search','/api/travel/revalidate','/api/auth/native/login'}}
        if urllib.parse.urlsplit(self.path).path not in by_method[method]:
            self.send_error(404)
            return
        target='https://www.diasporaunlocked.com'+self.path
        if method=='POST' and self.path.startswith('/api/auth/native/login'):
            email=json.loads(body).get('email','')
            if not email.startswith('qa-') or not email.endswith('@example.test'):
                self.send_error(403)
                return
        request=urllib.request.Request(target,data=body,method=method,headers={'Content-Type':'application/json','User-Agent':'DiasporaUnlockedReleaseQA/1.0','Accept':'application/json'})
        try:
            upstream=urllib.request.urlopen(request,timeout=26)
        except urllib.error.HTTPError as error:
            upstream=error
        try:
            data=upstream.read()
            status=upstream.getcode()
        finally:
            upstream.close()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        print('Production '+method+' '+urllib.parse.urlsplit(self.path).path+' status='+str(status),flush=True)
    def do_POST(self):
        body=self.rfile.read(int(self.headers['Content-Length']))
        if self.path != '/api/notifications/contact':
            return self.forward_public('POST',body)
        request=json.loads(body)
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
        if self.path.startswith('/api/travel/'):
            return self.forward_public('GET')
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"success":true,"data":[]}')
    def log_message(self,*args):
        pass
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),Handler).serve_forever()
