"""Browser-level v0.5 smoke test on a local HTTP origin. No external AI or deployment."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844},accept_downloads=True)
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
    page.wait_for_load_state('load')
    assert page.evaluate('Boolean(window.PonponRig && window.PonponRenderer && window.PonponRigEditor)')
    page.locator('[data-tab="rig-editor"]').click()
    page.get_by_role('button',name='＋ たぬき').click()
    assert page.locator('#rig-canvas').count()==1
    assert page.locator('#rig-part option').count()>=8
    page.locator('#rig-part').select_option('head')
    page.locator('[data-field="rotation"]').fill('17')
    page.locator('[data-field="rotation"]').dispatch_event('change')
    assert page.evaluate('state.rigs[0].parts.find(p=>p.id==="head").rotation')==17
    page.locator('#rig-preview-motion').select_option('nod')
    page.get_by_role('button',name='モーション再生 / 停止').click()
    page.wait_for_timeout(120)
    page.get_by_role('button',name='モーション再生 / 停止').click()
    page.locator('[data-tab="write"]').click()
    page.locator('#demo-btn').click()
    page.locator('#analyze-btn').click()
    assert page.locator('.cut').count()>=3
    page.locator('[data-tab="project"]').click()
    with page.expect_download() as ev: page.locator('#export-json').click()
    data_path=ROOT/'v05-browser-project.json'
    ev.value.save_as(str(data_path))
    project=json.loads(data_path.read_text())
    assert project['version']==5 and project['rigs']
    assert project['rigs'][0]['parts']
    page.locator('#import-json').set_input_files(str(data_path))
    page.wait_for_timeout(700)
    assert page.evaluate('state.rigs[0].parts.find(p=>p.id==="head").rotation')==17
    assert not errors,errors
    print('PASS browser: rig edit, nod preview, scene analysis, JSON roundtrip, no page errors')
    browser.close()
finally:
 server.shutdown()
