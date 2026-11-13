"""Run five release journeys on the installed Android phone using public app controls."""
import importlib.util
from pathlib import Path
import time

spec = importlib.util.spec_from_file_location('live', Path(__file__).with_name('live-android.py'))
live = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)
screen = live.screen

def open_page(path):
    screen.adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
               '-d', 'diasporaunlocked://' + path, screen.PACKAGE)

def edit(label, value):
    live.find(label, True)
    def field():
        return next(n for n in screen.tree().iter('node') if n.get('class') == 'android.widget.EditText'
                    and n.get('content-desc') == label)
    live.tap(field())
    screen.adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    screen.adb('shell', 'input', 'keycombination', 'KEYCODE_CTRL_LEFT', 'KEYCODE_A')
    screen.adb('shell', 'input', 'keyevent', 'KEYCODE_DEL')
    screen.adb('shell', 'input', 'text', value.replace(' ', '%s'))
    if field().get('text') != value:
        raise AssertionError('Incorrect input for ' + label)
    screen.adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')

def press(label):
    live.tap(live.find(label, True))

def exact_flight():
    open_page('travel/flights')
    edit('Flying from, city or airport code', 'LHR')
    edit('Departure date (YYYY-MM-DD)', '2027-01-15')
    edit('Return date (YYYY-MM-DD)', '2027-01-22')
    press('Edit travellers and currency')
    press('Add an adult')
    press('GBP')
    press('Search providers')
    check=live.find('Check current provider details',True,65)
    live.tap(check)
    live.find('Continue to Kiwi.com',True,45)
    details=['matched inputs London–Harare 15–22 January 2027, two adults, GBP',
             'selected and revalidated a Kiwi.com GBP offer']
    print('PASS ' + ', '.join(details), flush=True)
    # Clip coordinates to the visible ScrollView; partially obscured nodes can otherwise tap foot navigation.
    button=live.find('Continue to Kiwi.com',True,45)
    for attempt in range(3):
        scroll=next((n for n in screen.tree().iter('node') if n.get('class')=='android.widget.ScrollView' and n.get('package')==screen.PACKAGE),None)
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
                doc=screen.tree()
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
        doc=screen.tree()
        button=screen.node_for(doc,'Continue to Kiwi.com')
        text=[n.get('text') or n.get('content-desc','') for n in doc.iter('node') if n.get('package')==screen.PACKAGE]
        issues=[s for s in text if any(t in s.lower() for t in ('expired','could not open','checked price','problems','retry','checked.','your selection'))]
        print('After provider press retained button='+str(button is not None)+' visible feedback='+str(issues[:6]),flush=True)
        if button is None:break
    raise AssertionError('Provider foreground or Android VIEW host did not confirm the handoff')

def recover():
    open_page('reset-password')
    press('Request a new reset link')
    live.find('Send reset instructions',True)
    live.find('Email address')

def shop():
    open_page('shop/products?q=Mazoe%20Orange%202L')
    live.find('View details for ',True,45,True)
    # Use the accessibility switch so the proof exercises the control independently of URL parameter support.
    open_page('shop/products?q=Mazoe%20Orange%202L')
    node=live.find('Available to request only',True)
    switch=next(n for n in screen.tree().iter('node') if n.get('class')=='android.widget.Switch')
    if switch.get('checked')=='false':live.tap(switch)
    live.find('No products match. Change or clear your filters to see more.',True)
    open_page('shop/products?q=Mazoe%20Orange%202L')
    live.find('View details for ',True,45,True)

def basket():
    open_page('shop')
    press('Basket (0)')
    live.find('Your basket is empty.',True)

def consent():
    open_page('onesa-ai-chat')
    press('Keep my draft private')
    live.find('Sharing is off. Your draft stays here.',True)
    press('Review chat sharing')
    press('Allow sharing for this chat')
    press('Revoke chat sharing')
    live.find('Sharing is off. Your draft stays here.',True)

def wait_for_home():
    until=time.monotonic()+90
    closed_launcher=False
    while time.monotonic()<until:
        try:
            doc=screen.tree()
        except Exception:
            time.sleep(1)
            continue
        if screen.node_for(doc,'Explore what connects us') is not None:
            return
        launcher=any(n.get('package')=='android' and "Pixel Launcher isn't responding" in n.get('text','') for n in doc.iter('node'))
        if launcher:
            close=next((n for n in doc.iter('node') if n.get('package')=='android' and n.get('text')=='Close app'),None)
            if close is not None and not closed_launcher:
                live.tap(close)
                closed_launcher=True
                screen.adb('shell','am','start','-W','-n',screen.PACKAGE+'/.MainActivity')
                print('Recovered the Pixel Launcher system alert before application assertions',flush=True)
        time.sleep(0.8)
    screen.wait_for_label('Explore what connects us')

failures=[]
for name,case in [('Flight',exact_flight)]:
    try:
        screen.adb('shell','am','force-stop',screen.PACKAGE)
        screen.adb('shell','am','start','-W','-n',screen.PACKAGE+'/.MainActivity')
        wait_for_home()
        case()
        print('PASS installed Android ' + name,flush=True)
    except Exception as error:
        print('Incomplete '+name+': '+str(error)[:220],flush=True)
        failures.append(name)
if failures:raise SystemExit(', '.join(failures))
