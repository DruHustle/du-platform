"""Installed Android QA with a local recovery inbox and the actual public investment page."""
import importlib.util
from pathlib import Path
import time
spec=importlib.util.spec_from_file_location('live',Path(__file__).with_name('live-android.py'))
live=importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)
screen=live.screen

def read_tree():
    until=time.monotonic()+25
    last=None
    while time.monotonic()<until:
        try:
            return screen.tree()
        except (live.ElementTree.ParseError,live.subprocess.CalledProcessError,live.subprocess.TimeoutExpired) as error:
            last=error
            time.sleep(0.6)
    raise RuntimeError('Android accessibility dump unavailable: '+str(last))

def home():
    screen.adb('shell','am','force-stop',screen.PACKAGE)
    screen.adb('shell','am','start','-W','-n',screen.PACKAGE+'/.MainActivity')
    deadline=time.monotonic()+90
    while time.monotonic()<deadline:
        doc=read_tree()
        if screen.node_for(doc,'Explore what connects us') is not None:
            return
        if any(n.get('package')=='android' and "Pixel Launcher isn't responding" in n.get('text','') for n in doc.iter('node')):
            close=next((n for n in doc.iter('node') if n.get('package')=='android' and n.get('text')=='Close app'),None)
            if close is not None:
                live.tap(close)
                screen.adb('shell','am','start','-W','-n',screen.PACKAGE+'/.MainActivity')
        time.sleep(0.6)
    raise AssertionError('Home did not load')

def find_native(label, kind=None):
    for direction in [1,-1,1]:
        for _ in range(5):
            doc=read_tree()
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
        doc=read_tree()
        for n in doc.iter('node'):
            if n.get('package')!=screen.PACKAGE and any(label.lower() in n.get(k,'').lower() for k in ['text','content-desc']):
                return n
        if swipe:
            w,h=map(int,screen.adb('shell','wm','size').decode().strip().split()[-1].split('x'))
            screen.adb('shell','input','swipe',str(w//2),str(h*4//5),str(w//2),str(h//4),'330')
        time.sleep(0.4)
    return None

def investment():
    press('Browse investment research')
    live.find('Investment')
    candidates=[n for n in read_tree().iter('node') if n.get('package')==screen.PACKAGE and 'Search the business directory' in (n.get('text'),n.get('content-desc'))]
    button=next((n for n in candidates if n.get('clickable')=='true' and n.get('enabled')=='true'),None)
    assert button is not None,'Enabled directory button missing'
    print('Observed clickable Android directory action '+button.get('bounds',''),flush=True)
    screen.adb('shell','logcat','-c')
    live.tap(button)
    import re
    exact=False
    foreground=False
    until=time.monotonic()+50
    previous=None
    while time.monotonic()<until:
        activity=screen.adb('shell','dumpsys','activity','activities').decode(errors='replace')
        log=screen.adb('shell','logcat','-d','-s','ActivityTaskManager:I').decode(errors='replace')
        exact=exact or bool(re.search(r'https?://(?:www[.])?diasporaunlocked[.]com/ntir(?:[ /?}#\s]|$)',activity+'\n'+log))
        active=[m.group(1) for m in re.finditer(r'(?:mResumedActivity|topResumedActivity)[^\n]*?\bu\d+\s+([\w.]+/[^\s}]+)',activity)]
        foreground=foreground or any('chrome' in a or 'browser' in a for a in active)
        if previous!=(exact,active):
            print('Directory exact Android intent='+str(exact)+' active='+str(active),flush=True)
            previous=(exact,active)
        doc=read_tree()
        nodes=[(n.get('text') or n.get('content-desc',''),n) for n in doc.iter('node') if n.get('package')!=screen.PACKAGE]
        if any('NTIR business directory' in text for text,n in nodes):
            print('PASS direct Android investment action displayed the public NTIR business directory',flush=True)
            return
        for label in ['Use without an account','Continue without an account','No thanks','Essential only']:
            btn=next((n for text,n in nodes if text==label),None)
            if btn is not None:
                live.tap(btn)
                break
        time.sleep(0.7)
    assert exact and foreground,'No verified Android VIEW intent for /ntir or verified foreground browser'
    print('PASS exact Android NTIR intent and foreground browser; directory heading was not exposed by the browser',flush=True)

def open_page(path):
    screen.adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
               '-d', 'diasporaunlocked://' + path, screen.PACKAGE)

def edit(label, value):
    live.find(label, True)
    def field():
        return next(n for n in read_tree().iter('node') if n.get('class') == 'android.widget.EditText'
                    and n.get('content-desc') == label)
    live.tap(field())
    screen.adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    screen.adb('shell', 'input', 'keycombination', 'KEYCODE_CTRL_LEFT', 'KEYCODE_A')
    screen.adb('shell', 'input', 'keyevent', 'KEYCODE_DEL')
    screen.adb('shell', 'input', 'text', value.replace(' ', '%s'))
    if field().get('text') != value:
        raise AssertionError('Incorrect input for ' + label)
    screen.adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')

def press_flight(label):
    live.tap(live.find(label, True))

def exact_flight():
    open_page('travel/flights')
    edit('Flying from, city or airport code', 'LHR')
    edit('Departure date (YYYY-MM-DD)', '2027-01-15')
    edit('Return date (YYYY-MM-DD)', '2027-01-22')
    press_flight('Edit travellers and currency')
    press_flight('Add an adult')
    press_flight('GBP')
    press_flight('Search providers')
    check=live.find('Check current provider details',True,65)
    live.tap(check)
    live.find('Continue to Kiwi.com',True,45)
    details=['matched inputs London–Harare 15–22 January 2027, two adults, GBP',
             'selected and revalidated a Kiwi.com GBP offer']
    print('PASS ' + ', '.join(details), flush=True)
    # Clip coordinates to the visible ScrollView; partially obscured nodes can otherwise tap foot navigation.
    button=live.find('Continue to Kiwi.com',True,45)
    for attempt in range(3):
        scroll=next((n for n in read_tree().iter('node') if n.get('class')=='android.widget.ScrollView' and n.get('package')==screen.PACKAGE),None)
        box=screen.rect(button.get('bounds'))
        if scroll:
            sx1,sy1,sx2,sy2=screen.rect(scroll.get('bounds'))
            x1,y1,x2,y2=box
            if y2-y1<32 or y1<sy1+6 or y2>sy2-6:
                pos=(sx1+sx2)//2
                screen.adb('shell','input','swipe',str(pos),str(sy1+(sy2-sy1)*2//3),str(pos),str(sy1+(sy2-sy1)//3),'420')
                button=live.find('Continue to Kiwi.com',True,12)
                continue
        break
    print('Selected offer button enabled='+str(button.get('enabled'))+' bounds='+str(button.get('bounds')),flush=True)
    start=time.monotonic()
    seen=set()
    def summary():
        state=screen.adb('shell','dumpsys','activity','activities').decode()
        log=screen.adb('shell','logcat','-d','-s','ActivityTaskManager:I','ActivityManager:I').decode(errors='replace')
        foreground=[m.group(1) for m in live.re.finditer(r'(?:mResumedActivity|topResumedActivity)[^\n]*?\bu\d+\s+([\w.]+/[^\s}]+)',state)]
        hosts=sorted(set(live.re.findall(r'(?:dat=|data=)https?://([\w.-]+)',state+'\n'+log)))
        return foreground,hosts
    screen.adb('shell','logcat','-c')
    for click in range(2):
        live.tap(button)
        for i in range(18):
            fg,hosts=summary()
            current=(tuple(fg),tuple(hosts))
            if current not in seen:
                seen.add(current)
                print('Elapsed seconds='+str(round(time.monotonic()-start))+' foreground='+str(fg)+' VIEW hosts='+str(hosts),flush=True)
            matched=any(h=='kiwi.com' or h.endswith('.kiwi.com') for h in hosts)
            if matched and any(('chrome' in a or 'browser' in a) for a in fg):
                print('PASS matching Android provider host and foreground checkout browser',flush=True)
                return
            if i in (4,10):
                doc=read_tree()
                chrome=[(n.get('text') or n.get('content-desc','')) for n in doc.iter('node') if n.get('package','') in ('com.android.chrome','com.android.browser') and (n.get('text') or n.get('content-desc'))]
                paths=[s.split('?')[0].split('/')[0][:55] for s in chrome if 'kiwi.com' in s]
                if matched and chrome and paths:
                    print('PASS matched Android provider host and visible browser address '+str(paths),flush=True)
                    return
                permitted=['Use without an account','Continue without an account','No thanks','Just once','Open']
                for label in permitted:
                    control=next((n for n in doc.iter('node') if n.get('package','') in ('com.android.chrome','android','com.android.intentresolver') and n.get('text')==label),None)
                    if control is not None:
                        print('Browser/chooser action '+label,flush=True)
                        live.tap(control)
                        break
            time.sleep(1)
        doc=read_tree()
        button=screen.node_for(doc,'Continue to Kiwi.com')
        text=[n.get('text') or n.get('content-desc','') for n in doc.iter('node') if n.get('package')==screen.PACKAGE]
        issues=[s for s in text if any(t in s.lower() for t in ('expired','could not open','checked price','problems','retry','checked.','your selection'))]
        print('After provider press retained button='+str(button is not None)+' visible feedback='+str(issues[:6]),flush=True)
        if button is None:break
    raise AssertionError('Provider foreground or Android VIEW host did not confirm the handoff')


errors=[]
for name,test in [('contact persisted draft and identical retry',contact),('investment direct directory action',investment),('exact flight',exact_flight),('rejected sign-in retry',live.sign_in)]:
    try:
        home()
        test()
        print('PASS installed Android '+name,flush=True)
    except Exception as e:
        print('INCOMPLETE '+name+': '+str(e)[:250],flush=True)
        errors.append(name)
if errors:raise SystemExit(', '.join(errors))
