"""Installed Android QA with a local recovery inbox and the actual public investment page."""
import importlib.util
from pathlib import Path
import time
spec=importlib.util.spec_from_file_location('live',Path(__file__).with_name('live-android.py'))
live=importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)
screen=live.screen

def home():
    screen.adb('shell','am','force-stop',screen.PACKAGE)
    screen.adb('shell','am','start','-W','-n',screen.PACKAGE+'/.MainActivity')
    screen.wait_for_label('Explore what connects us')

def find_native(label, kind=None):
    for direction in [1,-1,1]:
        for _ in range(5):
            doc=screen.tree()
            node=next((n for n in doc.iter('node') if n.get('package')==screen.PACKAGE and label in (n.get('text'),n.get('content-desc')) and (kind is None or n.get('class')==kind)),None)
            if node is not None:
                return node
            size=screen.adb('shell','wm','size').decode().strip().split()[-1].split('x')
            w,h=map(int,size)
            a,b=(0.76,0.30) if direction==1 else (0.30,0.76)
            screen.adb('shell','input','swipe',str(w//2),str(int(h*a)),str(w//2),str(int(h*b)),'350')
    raise RuntimeError('Unreachable native control '+label)

def press(label):
    live.tap(find_native(label))

def field(label,value):
    live.tap(find_native(label,'android.widget.EditText'))
    screen.adb('shell','input','text',value.replace(' ','%s'))
    screen.adb('shell','input','keyevent','KEYCODE_BACK')
    assert find_native(label,'android.widget.EditText').get('text')==value,label

def contact():
    press('Contact us')
    field('Full name','Release fixture')
    field('Email address','release-fixture@example.test')
    field('Subject','Release recovery fixture')
    field('Message','Isolated support recovery verification')
    press('Send message')
    live.find('Retry same message',True,35)
    home()
    press('Contact us')
    live.find('A previous message was not confirmed. Retry the same message.',True,30)
    assert find_native('Email address','android.widget.EditText').get('text')=='release-fixture@example.test'
    assert find_native('Message','android.widget.EditText').get('text')=='Isolated support recovery verification'
    press('Retry same message')
    msg=live.find('Your message was received. Reference: ',True,35,True)
    text=msg.get('text') or msg.get('content-desc')
    assert len(text.rsplit(': ',1)[1])==36

def consent():
    screen.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d','diasporaunlocked://onesa-ai-chat',screen.PACKAGE)
    field('Your message','Private fixture draft')
    press('Keep my draft private')
    assert find_native('Your message','android.widget.EditText').get('text')=='Private fixture draft'
    assert find_native('Send message').get('enabled')=='false'
    press('Review chat sharing')
    press('Allow sharing for this chat')
    assert find_native('Send message').get('enabled')=='true'
    press('Revoke chat sharing')
    assert find_native('Your message','android.widget.EditText').get('text')=='Private fixture draft'
    assert find_native('Send message').get('enabled')=='false'

def web_text(label,seconds,swipe=False):
    until=time.monotonic()+seconds
    while time.monotonic()<until:
        doc=screen.tree()
        for n in doc.iter('node'):
            if n.get('package')!=screen.PACKAGE and label in [n.get('text'),n.get('content-desc')]:
                return n
        if swipe:
            w,h=map(int,screen.adb('shell','wm','size').decode().strip().split()[-1].split('x'))
            screen.adb('shell','input','swipe',str(w//2),str(h*4//5),str(w//2),str(h//4),'330')
        time.sleep(0.4)
    return None

def investment():
    press('Browse investment research')
    live.find('Investment')
    press('Open website')
    activity=screen.adb('shell','dumpsys','activity','activities').decode()
    assert 'diasporaunlocked.com/investment' in activity
    print('PASS Android native investment handoff to its exact public URL',flush=True)
    for label in ['Use without an account','Continue without an account','No thanks','Essential only']:
        node=web_text(label,4)
        if node is not None:
            live.tap(node)
            if label=='Essential only':print('PASS essential-only web consent in Android browser',flush=True)
    link=web_text('Search the directory',65,True)
    assert link is not None,'Directory link missing from browser content'
    live.tap(link)
    assert web_text('NTIR business directory',35) is not None,'Directory heading missing'
errors=[]
for name,test in [('contact persisted draft and identical retry',contact),('assistant draft decline and revoke',consent),('investment via visible link to NTIR',investment)]:
    try:
        home()
        test()
        print('PASS installed Android '+name,flush=True)
    except Exception as e:
        print('INCOMPLETE '+name+': '+str(e)[:250],flush=True)
        errors.append(name)
if errors:raise SystemExit(', '.join(errors))
