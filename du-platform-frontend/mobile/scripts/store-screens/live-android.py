"""Check a real production provider handoff and rejected sign-in without sending customer data."""
import importlib.util
from pathlib import Path
import re
import time
from uuid import uuid4

spec = importlib.util.spec_from_file_location('screen', Path(__file__).with_name('capture-android.py'))
screen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(screen)


def tap(node):
    x1,y1,x2,y2 = screen.rect(node.attrib['bounds'])
    screen.adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))


def find(label, scroll=False, timeout=40):
    until = time.monotonic()+timeout
    while time.monotonic()<until:
        doc=screen.tree(); node=screen.node_for(doc,label)
        if node is not None: return node
        if scroll:
            display=max((n for n in doc.iter('node') if n.get('package')==screen.PACKAGE),key=lambda n:screen.area(n.attrib['bounds']),default=None)
            if display is not None:
                x1,y1,x2,y2=screen.rect(display.attrib['bounds']); x=str((x1+x2)//2)
                screen.adb('shell','input','swipe',x,str(y1+3*(y2-y1)//4),x,str(y1+(y2-y1)//3),'370')
        time.sleep(0.7)
    raise RuntimeError(f'Could not reach {label!r} in the installed app')


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
    tab=None
    for node in screen.tree().iter('node'):
        if node.get('package')==screen.PACKAGE and any(s.startswith('Account') for s in [node.get('text',''),node.get('content-desc','')]): tab=node;break
    if tab is None: raise RuntimeError('Account tab missing')
    tap(tab)
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
    failures=[]
    for name,work in [('Direct flight handoff',flight),('Sign-in retry',sign_in)]:
        try: work()
        except Exception as error: failures.append(name);print(f'{name} not verified: {error}',flush=True)
    if failures: raise SystemExit('Live Android checks did not pass: '+', '.join(failures))
