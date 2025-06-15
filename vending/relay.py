import time
import grovepi

# Connect the Grove Relay to digital port D4
# SIG,NC,VCC,GND
relay = 3

grovepi.pinMode(relay, "OUTPUT")

from BaseHTTPServer import BaseHTTPRequestHandler,HTTPServer

PORT_NUMBER = 9000

#This class will handles any incoming request from
#the browser 
class myHandler(BaseHTTPRequestHandler):
	
	#Handler for the GET requests
	def do_GET(self):
		self.send_response(200)
		self.send_header('Content-type', 'application/json')
		self.end_headers()
		# Send the html message
		self.wfile.write('{ }')
		
		grovepi.digitalWrite(relay, 1)
		time.sleep(1)		
		grovepi.digitalWrite(relay, 0)			
		grovepi.pinMode(relay, "OUTPUT")

		return

try:
	#Create a web server and define the handler to manage the
	#incoming request
	server = HTTPServer(('', PORT_NUMBER), myHandler)
	print 'Started httpserver on port ' , PORT_NUMBER
	
	#Wait forever for incoming htto requests
	server.serve_forever()

except KeyboardInterrupt:
	print '^C received, shutting down the web server'
	server.socket.close()

