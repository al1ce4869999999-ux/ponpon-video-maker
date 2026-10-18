from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda x: errors.append(str(x)))
    page.set_content((ROOT/'index.html').read_text().replace('<script src="./analyzer.js"></script>', '<script>'+ (ROOT/'analyzer.js').read_text().replace('</script>', '<\\/script>') +'</script>'), wait_until='load')
    page.wait_for_timeout(300)
    assert 'v0.4' in page.locator('.brand p').inner_text()
    assert page.evaluate('Boolean(window.PonponAnalyzer)')
    assert page.locator('#analysis-report').count()==1
    page.locator('#demo-btn').click()
    page.locator('#analyze-btn').click()
    assert page.locator('.cut').count()==6, page.locator('.cut').count()
    assert page.locator('.analysis-detail').count()==6, page.locator('.analysis-detail').count()
    assert '6文章ブロック' in page.locator('#analysis-report').inner_text()
    assert '試み' in page.locator('#analysis-report').inner_text()
    assert page.locator('.cut:nth-child(2) input[data-edit="speaker"]').input_value()=='ぽんぽん'
    assert page.locator('.cut:nth-child(4) select[data-edit="captionStyle"]').input_value()=='speech'
    assert page.locator('.cut:nth-child(6) select[data-edit="comic"]').input_value()=='impact'
    # user modifications continue to work with analysis metadata
    page.locator('.cut:nth-child(4) input[data-edit="speaker"]').fill('椿')
    page.locator('.cut:nth-child(4) select[data-edit="speakerSide"]').select_option('right')
    page.locator('.cut:nth-child(6) select[data-edit="transition"]').select_option('wipe')
    page.locator('#to-preview').click()
    page.evaluate('renderStage(6)')
    page.wait_for_timeout(150)
    assert 'CUT 3/6' in page.locator('#stage-meta').inner_text(), page.locator('#stage-meta').inner_text()
    page.locator('#stage').screenshot(path=str(ROOT/'v04-canvas.png'))
    page.screenshot(path=str(ROOT/'v04-browser.png'),full_page=True)
    parts=page.locator('#export-part option').all_text_contents()
    assert len(parts)>=2,parts
    page.locator('[data-tab="project"]').click()
    with page.expect_download(timeout=8000) as event:page.locator('#export-json').click()
    dump=ROOT/'v04-project.json';event.value.save_as(str(dump))
    dat=json.loads(dump.read_text())
    assert dat['version']==4
    assert dat['cuts'][3]['speaker']=='椿'
    assert dat['cuts'][3]['analysis']['manual']==True
    assert dat['cuts'][5]['transition']=='wipe'
    assert dat['analysisReport']['segments']==6
    # restore after reset without loss of analysis fields
    page.on('dialog',lambda d:d.accept())
    page.locator('#reset').click()
    assert page.locator('#analysis-report').inner_text().find('解析')>=0
    page.locator('#import-json').set_input_files(str(dump))
    page.wait_for_timeout(550)
    page.locator('[data-tab="storyboard"]').click()
    assert page.locator('.cut').count()==6
    assert page.locator('.cut:nth-child(4) input[data-edit="speaker"]').input_value()=='椿'
    assert page.locator('.analysis-detail').count()==6
    # JSON-based export/import roundtrip verified above; IndexedDB reload requires a real secure origin.
    # no xss through strings
    page.locator('[data-tab="write"]').click()
    page.locator('#scene-text').fill('*ぽんぽんは<script>window.testXSS=1</script>を見た。*')
    page.locator('#analyze-btn').click()
    assert page.locator('.cut').count()==1
    assert not page.evaluate('Boolean(window.testXSS)')
    assert not errors,errors
    print('PASS mobile Chromium: scene parsing, 6 cuts, report, comic, preview, JSON roundtrip, XSS safe')
    # short export test with one cut. NOTE relies on headless MediaRecorder support, iPhone not verified.
    page.locator('#to-preview').click()
    if page.evaluate('Boolean(mimeType())'):
        with page.expect_download(timeout=22000) as event:page.locator('#record').click()
        v=ROOT/('v04-video'+Path(event.value.suggested_filename).suffix)
        event.value.save_as(str(v))
        assert v.stat().st_size>2000
        print('PASS video export:',v.name,v.stat().st_size,'bytes')
    browser.close()