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
        print("Please run 'create_cert.ps1' first to generate the certificate")
        sys.exit(1)
    
    # Create server
    httpd = http.server.HTTPServer(('', PORT), MyHTTPRequestHandler)
    
    # Wrap with SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    try:
        # Try to load certificate (both cert and key from same PEM file)
        context.load_cert_chain(CERTFILE)
    except Exception as e:
        print(f"Error loading certificate: {e}")
        print("Please make sure the certificate was created correctly")
        sys.exit(1)
    
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"HTTPS Server running on https://localhost:{PORT}/")
    print(f"Using certificate: {CERTFILE}")
    print("Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == '__main__':
    main()
