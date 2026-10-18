"""Browser-level v0.5 smoke test on a local HTTP origin. No external AI or deployment."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json
import os
import struct
import zlib
import subprocess
ROOT=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
    engine=os.environ.get('PONPON_BROWSER','chromium')
    browser=(p.webkit.launch(headless=True) if engine=='webkit' else p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage']))
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
    # Register a tiny transparent test PNG (not character art).
    png=ROOT/'v05-test-part.png'
    def chunk(tag,data):
        return struct.pack('!I',len(data))+tag+data+struct.pack('!I',zlib.crc32(tag+data)&0xffffffff)
    png.write_bytes(b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('!2I5B',1,1,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b'\\x00\\xff\\x80\\x40\\xff'))+chunk(b'IEND',b''))
    page.locator('#rig-image').set_input_files(str(png))
    page.wait_for_function('Boolean(state.rigs[0].parts.find(p=>p.id==="head").image)',timeout=8000)
    # Exercise canvas pointer-based movement (same event handlers as touch).
    canvas=page.locator('#rig-canvas')
    canvas.scroll_into_view_if_needed()
    bb=canvas.bounding_box()
    x=bb['x']+bb['width']/2
    y=bb['y']+bb['height']/2
    page.mouse.move(x,y)
    page.mouse.down()
    page.mouse.move(x+15,y+10,steps=4)
    page.mouse.up()
    assert page.evaluate('state.rigs[0].parts.find(p=>p.id==="head").x')!=0
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
    # Export the shortest available segment; format is negotiated by Chromium.
    page.locator('[data-tab="storyboard"]').click()
    page.locator('.cut').first.locator('[data-edit="duration"]').select_option('2')
    page.locator('[data-tab="preview"]').click()
    page.locator('#export-part').select_option(index=1)
    supports=page.evaluate('Boolean(mimeType())')
    if supports and engine=='chromium':
        with page.expect_download(timeout=25000) as export:
            page.locator('#record').click()
        video=ROOT/('v05-export'+Path(export.value.suggested_filename).suffix)
        export.value.save_as(str(video))
        assert video.stat().st_size>2000
        decoded=subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],capture_output=True,text=True)
        assert decoded.returncode==0, decoded.stderr
        print('PASS browser video export and ffmpeg decode:',video.name,video.stat().st_size)
    else:
        print('SKIP browser video export: MediaRecorder MIME unsupported')
    # 3-cut mixed rig / classic export: exercise transition boundaries.
    page.evaluate("""() => {
      state.cuts = state.cuts.slice(0,3);
      state.cuts.forEach((c,i) => {c.duration=2; c.transition=i===1?'wipe':i===2?'fade':'cut';});
      state.cuts[0].useRig=true;state.cuts[0].rigId=state.rigs[0].id;state.cuts[0].rigMotion='nod';
      state.cuts[1].useRig=false;
      state.cuts[2].useRig=true;state.cuts[2].rigId=state.rigs[0].id;state.cuts[2].rigMotion='tail_wag';
      updateStats();
    }""")
    page.locator('#export-part').select_option('all')
    if supports and engine=='chromium':
        with page.expect_download(timeout=25000) as export:
            page.locator('#record').click()
        mixed=ROOT/('v05-mixed'+Path(export.value.suggested_filename).suffix)
        export.value.save_as(str(mixed))
        assert mixed.stat().st_size>2000
        decoded=subprocess.run(['ffmpeg','-v','error','-i',str(mixed),'-f','null','-'],capture_output=True,text=True)
        assert decoded.returncode==0,decoded.stderr
        print('PASS mixed 3-cut video export and ffmpeg decode:',mixed.name,mixed.stat().st_size)
    browser.close()
finally:
 server.shutdown()
