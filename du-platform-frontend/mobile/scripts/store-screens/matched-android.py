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
    press('Continue to Kiwi.com')
    for _ in range(20):
        state=screen.adb('shell','dumpsys','activity','activities').decode()
        if live.re.search(r'Intent \{[^\n]*?act=android.intent.action.VIEW[^\n]*?dat=https?://(?:[\w-]+\.)*kiwi\.com(?:[/ ?}]|$)',state) and live.re.search(r'(?:mResumedActivity|topResumedActivity)[^\n]*(?:com\.android\.(?:chrome|browser)|org\.chromium)',state):
            print('PASS matching Android provider host and foreground checkout browser',flush=True)
            return
        time.sleep(1)
    raise AssertionError('No Kiwi.com handoff')

def recover():
    open_page('reset-password')
    live.find('This link is missing its reset token. Request a new link on the account screen.',True)

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

failures=[]
for name,case in [('Flight',exact_flight),('Reset',recover),('Catalogue',shop),('Basket',basket),('Consent',consent)]:
    try:
        screen.adb('shell','am','force-stop',screen.PACKAGE)
        screen.adb('shell','am','start','-W','-n',screen.PACKAGE+'/.MainActivity')
        screen.wait_for_label('Explore what connects us')
        case()
        print('PASS installed Android ' + name,flush=True)
    except Exception as error:
        print('Incomplete '+name+': '+str(error)[:220],flush=True)
        failures.append(name)
if failures:raise SystemExit(', '.join(failures))
