#!/usr/bin/env python3
"""
Simple HTTPS server for local development with self-signed certificate
"""
import http.server
import ssl
import os
import sys

PORT = 8443
CERTFILE = os.path.join(os.path.dirname(__file__), 'localhost.pem')
KEYFILE = os.path.join(os.path.dirname(__file__), 'localhost-key.pem')

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Check if certificate exists
    if not os.path.exists(CERTFILE):
        print(f"Error: Certificate file not found: {CERTFILE}")
        print("Please run certificate generation script first")
        sys.exit(1)
    
    if not os.path.exists(KEYFILE):
        print(f"Error: Key file not found: {KEYFILE}")
        print("Please run certificate generation script first")
        sys.exit(1)
    
    # Change to parent directory to serve index.html and other files
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(parent_dir)
    print(f"Serving files from: {parent_dir}")
    
    # Create server
    httpd = http.server.HTTPServer(('', PORT), MyHTTPRequestHandler)
    
    # Wrap with SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    try:
        # Load certificate and private key from separate files
        context.load_cert_chain(CERTFILE, KEYFILE)
    except Exception as e:
        print(f"Error loading certificate: {e}")
        print("Please make sure the certificate was created correctly")
        sys.exit(1)
    
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"HTTPS Server running on https://localhost:{PORT}/")
    print(f"Using certificate: {CERTFILE}")
    print(f"Using key: {KEYFILE}")
    print("Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == '__main__':
    main()
