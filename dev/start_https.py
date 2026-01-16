#!/usr/bin/env python3
"""
Generate a self-signed certificate and start an HTTPS server with OAuth proxy
"""
import http.server
import ssl
import os
import subprocess
import sys
import json
import urllib.parse
import urllib.request
from urllib.error import HTTPError

PORT = 8443
OAUTH_TOKEN_URL = 'https://www.onlinescoutmanager.co.uk/oauth/token'
OAUTH_RESOURCE_URL = 'https://www.onlinescoutmanager.co.uk/oauth/resource'

def generate_certificate():
    """Generate self-signed certificate using OpenSSL if available"""
    cert_file = os.path.join('dev', 'localhost.pem')
    key_file = os.path.join('dev', 'localhost-key.pem')
    
    # Check if certificate already exists
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print(f"Certificate files already exist:")
        print(f"  - {cert_file}")
        print(f"  - {key_file}")
        return cert_file, key_file
    
    print("Generating self-signed certificate...")
    
    # Try using openssl command
    try:
        subprocess.run([
            'openssl', 'req', '-x509', '-newkey', 'rsa:4096',
            '-keyout', key_file,
            '-out', cert_file,
            '-days', '365',
            '-nodes',
            '-subj', '/CN=localhost'
        ], check=True, capture_output=True)
        print("Certificate created successfully with OpenSSL!")
        return cert_file, key_file
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("OpenSSL not found. Trying alternative method...")
    
    # Alternative: Use Python's cryptography library
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import datetime
        
        print("Generating certificate using Python cryptography library...")
        
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # Generate certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName(u"localhost"),
            ]),
            critical=False,
        ).sign(private_key, hashes.SHA256())
        
        # Write private key
        with open(key_file, "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        # Write certificate
        with open(cert_file, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        print("Certificate created successfully!")
        return cert_file, key_file
        
    except ImportError:
        print("\nERROR: Cannot generate certificate.")
        print("\nPlease install one of the following:")
        print("\n  Option 1 - Install Python cryptography library:")
        print("    pip install cryptography")
        print("\n  Option 2 - Install OpenSSL:")
        print("    winget install -e --id ShiningLight.OpenSSL")
        print("\nThen run this script again.")
        sys.exit(1)

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests (OAuth resource proxy)"""
        if self.path.startswith('/oauth/resource'):
            # Proxy the OAuth resource request to avoid CORS issues
            auth_header = self.headers.get('Authorization')
            
            if not auth_header:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "missing_authorization"}')
                return
            
            try:
                # Forward the request to OSM
                req = urllib.request.Request(
                    OAUTH_RESOURCE_URL,
                    headers={'Authorization': auth_header}
                )
                
                with urllib.request.urlopen(req) as response:
                    response_data = response.read()
                    
                    # Send success response
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data)
                    
            except HTTPError as e:
                # Forward the error response
                error_data = e.read()
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(error_data)
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_json = json.dumps({'error': 'proxy_error', 'message': str(e)})
                self.wfile.write(error_json.encode())
        else:
            # Serve static files normally
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests (OAuth token proxy)"""
        if self.path == '/oauth/token':
            # Proxy the OAuth token request to avoid CORS issues
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Forward the request to OSM
                req = urllib.request.Request(
                    OAUTH_TOKEN_URL,
                    data=post_data,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                
                with urllib.request.urlopen(req) as response:
                    response_data = response.read()
                    
                    # Send success response
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data)
                    
            except HTTPError as e:
                # Forward the error response
                error_data = e.read()
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(error_data)
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                error_json = json.dumps({'error': 'proxy_error', 'message': str(e)})
                self.wfile.write(error_json.encode())
        else:
            # Other POST requests
            self.send_response(404)
            self.end_headers()
    
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Generate or verify certificate exists
    cert_file, key_file = generate_certificate()
    
    # Create server
    httpd = http.server.HTTPServer(('', PORT), MyHTTPRequestHandler)
    
    # Wrap with SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"\n{'='*60}")
    print(f"HTTPS Server running on https://localhost:{PORT}/")
    print(f"{'='*60}")
    print(f"\nCertificate: {cert_file}")
    print(f"Private Key: {key_file}")
    print(f"\nNOTE: You may see a browser warning about the self-signed certificate.")
    print(f"This is normal. Click 'Advanced' and 'Proceed to localhost' to continue.")
    print(f"\nPress Ctrl+C to stop the server")
    print(f"{'='*60}\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == '__main__':
    main()
