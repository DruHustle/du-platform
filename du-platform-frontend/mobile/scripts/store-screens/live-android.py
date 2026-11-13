"""Check a real production provider handoff and rejected sign-in without sending customer data."""
import importlib.util
from pathlib import Path
import sys
import re
import subprocess
from xml.etree import ElementTree
import time
from uuid import uuid4

spec = importlib.util.spec_from_file_location('screen', Path(__file__).with_name('capture-android.py'))
screen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(screen)


def tap(node):
    x1,y1,x2,y2 = screen.rect(node.attrib['bounds'])
    screen.adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))


def swipe_content(doc):
    display = max((n for n in doc.iter('node') if n.get('package') == screen.PACKAGE),
                  key=lambda n: screen.area(n.attrib['bounds']), default=None)
    if display is not None:
        x1, y1, x2, y2 = screen.rect(display.attrib['bounds'])
        x = str((x1 + x2) // 2)
        screen.adb('shell', 'input', 'swipe', x, str(y1 + 3*(y2-y1)//4),
                   x, str(y1 + (y2-y1)//3), '370')


def find(label, scroll=False, timeout=40, prefix=False):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        try:
            doc = screen.tree()
        except (ElementTree.ParseError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            time.sleep(1)
            continue
        if prefix:
            node = next((n for n in doc.iter('node') if n.get('package') == screen.PACKAGE
                        and any(n.get(k,'').startswith(label) for k in ('content-desc','text'))), None)
        else:
            node = screen.node_for(doc,label)
        if node is not None:
            return node
        if scroll:
            swipe_content(doc)
        time.sleep(0.7)
    raise RuntimeError(f'Could not reach {label!r} in the installed app')


def product_capture(target):
    assistant_target = Path(target).with_name('Onesa.png')
    screen.adb('shell','am','start','-W','-a','android.intent.action.VIEW',
               '-d', 'diasporaunlocked://onesa-ai-chat', screen.PACKAGE)
    screen.wait_for_label('Onesa assistant')
    screen.capture(assistant_target)
    screen.adb('shell', 'am', 'force-stop', screen.PACKAGE)
    screen.adb('shell', 'am', 'start', '-W', '-n', screen.PACKAGE+'/.MainActivity')
    screen.wait_for_label('Explore what connects us')
    tap(find('Browse products', True))
    find('Search products')
    product = find('View details for ', scroll=True, prefix=True)
    name = product.get('content-desc', '').removeprefix('View details for ')
    if not name:
        raise RuntimeError('Missing accessible product name')
    tap(product)
    find(name)
    find('Indicative price:', prefix=True)
    screen.capture(Path(target))
    print('PASS installed Android product details and indicative price')


def flight():
    tap(find('Search providers',True)); tap(find('Check current provider details',True,55)); tap(find('Continue to Kiwi.com',True,45))
    deadline=time.monotonic()+20
    while time.monotonic()<deadline:
        state=screen.adb('shell','dumpsys','activity','activities').decode()
        # Verify the immediately launched activity's VIEW intent, host, and foreground browser separately.
        intents=re.findall(r'Intent \{[^\n]*?act=android.intent.action.VIEW[^\n]*?dat=https?://(?:[\w-]+\.)*kiwi\.com(?:[/ ?}]|$)',state)
        foreground=re.search(r'(?:mResumedActivity|topResumedActivity)[^\n]*(?:com\.android\.(?:chrome|browser)|org\.chromium)',state)
        if intents and foreground:
            print('PASS installed Android direct Kiwi.com handoff; browser foreground, matching Android VIEW intent')
            return
        time.sleep(1)
    raise RuntimeError('Provider launch did not expose both the Kiwi.com intent and foreground browser')


def sign_in():
    screen.adb('shell','am','force-stop',screen.PACKAGE)
    screen.adb('shell','am','start','-W','-n',screen.PACKAGE+'/.MainActivity')
    screen.wait_for_label('Explore what connects us')
    screen.adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
               '-d', 'diasporaunlocked://login', screen.PACKAGE)
    screen.wait_for_label('Welcome back')
    def field(label):
        for node in screen.tree().iter('node'):
            if node.get('class')=='android.widget.EditText' and node.get('content-desc')==label: return node
        raise RuntimeError('Labelled field missing: '+label)
    find('Email address');email='qa-'+uuid4().hex[:12]+'@example.test';tap(field('Email address'));screen.adb('shell','input','text',email)
    tap(field('Password'));screen.adb('shell','input','text','FixtureOnly123');screen.adb('shell','input','keyevent','KEYCODE_BACK')
    for _ in range(2):
        tap(find('Sign in',True)); find('Invalid email or password.',False,25)
    if field('Email address').get('text')!=email: raise RuntimeError('Email lost after retry')
    print('PASS native sign-in rejected synthetic identity twice and kept its email for retry')


if __name__=='__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'product':
        product_capture(sys.argv[2])
        sys.exit(0)
    failures=[]
    for name,work in [('Direct flight handoff',flight),('Sign-in retry',sign_in)]:
        try: work()
        except Exception as error: failures.append(name);print(f'{name} not verified: {error}',flush=True)
    if failures: raise SystemExit('Live Android checks did not pass: '+', '.join(failures))
