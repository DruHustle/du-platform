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


def find(label, scroll=False, timeout=40, prefix=False, field=False, actionable=False):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        try:
            doc = screen.tree()
        except (ElementTree.ParseError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            time.sleep(1)
            continue
        node = next((n for n in doc.iter('node')
                     if n.get('package') == screen.PACKAGE
                     and (not field or n.get('class') == 'android.widget.EditText')
                     and (not actionable or n.get('clickable') == 'true' and n.get('class') != 'android.widget.EditText')
                     and any(n.get(k, '').startswith(label) if prefix else n.get(k) == label
                             for k in ('content-desc', 'text'))), None)
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
    screen.wait_for_label('Plan three days in Victoria Falls')
    screen.capture(assistant_target)
    screen.adb('shell', 'am', 'force-stop', screen.PACKAGE)
    screen.adb('shell', 'am', 'start', '-W', '-n', screen.PACKAGE+'/.MainActivity')
    screen.wait_for_label('Plan your next trip home')
    tap(find('Browse Zimbabwean products', True))
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
    tap(find('Search Kiwi.com',True)); tap(find('Check current provider details',True,55)); tap(find('Continue to Kiwi.com',True,45))
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
    screen.wait_for_label('Plan your next trip home')
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


def recover_missing_reset_link():
    screen.adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
               '-d', 'diasporaunlocked://reset-password?next=%2Ftravel%2Fstays', screen.PACKAGE)
    tap(find('Request a new reset link', scroll=True))
    find('Send reset instructions', scroll=True)
    find('Email address')
    print('PASS Android missing reset link opens the email recovery form')



def open_home():
    screen.adb('shell', 'am', 'force-stop', screen.PACKAGE)
    screen.adb('shell', 'am', 'start', '-W', '-n', screen.PACKAGE + '/.MainActivity')
    screen.wait_for_label('Plan your next trip home')


def open_app_link(path):
    screen.adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
               '-d', 'diasporaunlocked://' + path, screen.PACKAGE)


def type_in_field(label, value):
    node = find(label, scroll=True, field=True)
    tap(node)
    screen.adb('shell', 'input', 'text', value)
    # Exit the software keyboard only when the input method actually opened it.
    if 'mInputShown=true' in screen.adb('shell', 'dumpsys', 'input_method').decode():
        screen.adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')


def care_lookup():
    open_home()
    tap(find('Find funeral cover providers', scroll=True))
    tap(find('How can I cover funeral costs for a relative in Zimbabwe?', scroll=True))
    for label, country in [('Where do you live?', 'Germany'),
                           ('Where does the person you want to cover live?', 'Zimbabwe')]:
        type_in_field(label, country)
        tap(find(country, scroll=True, actionable=True))
    find('Read the cash funeral plan at ZB', scroll=True)
    print('PASS installed Android family funeral cover lookup for a German resident and a relative in Zimbabwe')


def family_stay():
    open_home()
    tap(find('Find a stay', scroll=True))
    find('Choose the city or area where you want to stay.')
    type_in_field('Guest nationality (two-letter country code)', 'DE')
    tap(find('Edit travellers and currency', scroll=True))
    tap(find('Add an adult', scroll=True))
    tap(find('Add a child', scroll=True))
    type_in_field('Child 1 age (0–17)', '6')
    tap(find('Search Pilot', scroll=True))
    until = time.monotonic() + 60
    while time.monotonic() < until:
        doc = screen.tree()
        if screen.node_for(doc, 'Check current provider details') is not None:
            print('PASS installed Android Pilot family search returned a stay')
            return
        if screen.node_for(doc, 'No options were returned for this search. Try different dates or locations.') is not None:
            print('PASS installed Android Pilot family search returned no options')
            return
        swipe_content(doc)
        time.sleep(1)
    raise RuntimeError('No family stay results or valid empty search outcome')


def planner_and_guide():
    open_app_link('onesa')
    tap(find('Plan three days in Victoria Falls', scroll=True))
    find('Open trip planner')
    open_app_link('business-guides/farming')
    find('Farming and food production guide')
    find('Open farming and food production guide')
    print('PASS installed Android Onesa itinerary and farming bookmark reached their website handoff screens')


if __name__=='__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'product':
        product_capture(sys.argv[2])
        sys.exit(0)
    failures=[]
    for name,work in [('Direct flight handoff',flight),('Sign-in retry',sign_in),('Missing reset link',recover_missing_reset_link),
                      ('Care provider lookup',care_lookup),('Family stay search',family_stay),
                      ('Planner and business guide',planner_and_guide)]:
        try: work()
        except Exception as error: failures.append(name);print(f'{name} not verified: {error}',flush=True)
    if failures: raise SystemExit('Live Android checks did not pass: '+', '.join(failures))
