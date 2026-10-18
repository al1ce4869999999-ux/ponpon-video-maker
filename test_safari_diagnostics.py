from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json
import os
root=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  engine=os.environ.get('PONPON_BROWSER','chromium')
  browser=p.webkit.launch() if engine=='webkit' else p.chromium.launch(args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':844})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/safari-diagnostics.html')
  page.locator('#check').click()
  assert json.loads(page.locator('#output').inner_text())['indexedDB']
  canvas=page.locator('#canvas')
  canvas.scroll_into_view_if_needed()
  b=canvas.bounding_box()
  x=b['x']+b['width']*.3;y=b['y']+b['height']*.5
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+45,y);page.mouse.up()
  assert json.loads(page.locator('#output').inner_text())['pointer']['moved']
  assert not errors,errors
  print('PASS safari diagnostic page:',engine,'features and pointer')
  browser.close()
finally:server.shutdown()
