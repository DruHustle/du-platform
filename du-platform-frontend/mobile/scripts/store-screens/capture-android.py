"""Exercise the installed Release APK using its actual accessibility hierarchy."""
import io
import re
from pathlib import Path
import subprocess
import sys
import time
from xml.etree import ElementTree



PACKAGE = 'com.diasporaunlocked.app'


def adb(*args):
    return subprocess.run(['adb', *args], check=True, capture_output=True, timeout=25).stdout


def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/du-screens.xml')
    return ElementTree.fromstring(adb('exec-out', 'cat', '/sdcard/du-screens.xml'))


def node_for(document, label):
    return next((node for node in document.iter('node') if node.get('package') == PACKAGE
                 and label in (node.get('text'), node.get('content-desc'))), None)


def wait_for_label(label):
    deadline = time.monotonic() + 65
    document = ElementTree.Element('hierarchy')
    while time.monotonic() < deadline:
        try:
            document = tree()
        except (ElementTree.ParseError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            time.sleep(1)
            continue
        node = node_for(document, label)
        if node is not None:
            return node
        time.sleep(1)
    visible = [(n.get('package'), n.get('text'), n.get('content-desc')) for n in document.iter('node') if n.get('text') or n.get('content-desc')]
    raise RuntimeError(f'{label!r} was not visible. Public screen labels: {visible[:35]}')


def capture(output):
    from PIL import Image
    png = adb('exec-out', 'screencap', '-p')
    if not png.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Android did not return a PNG')
    # Google Play accepts 24-bit PNGs without an alpha channel. Keep every pixel and the original resolution.
    with Image.open(io.BytesIO(png)) as captured:
        if captured.mode not in ('RGB', 'RGBA'):
            raise RuntimeError('Unexpected Android capture pixel format')
        if captured.mode == 'RGBA' and captured.getextrema()[-1] != (255, 255):
            raise RuntimeError('Unexpected transparent pixels in Android capture')
        captured.convert('RGB').save(output, format='PNG')


def main():
    output = Path(sys.argv[1]); output.mkdir(parents=True, exist_ok=True)
    width, height, density = {'phone': (1080, 1920, 420), 'tablet': (1440, 2560, 300)}[output.name]
    adb('shell', 'wm', 'size', f'{width}x{height}')
    adb('shell', 'wm', 'density', str(density))
    adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0')
    adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
    adb('shell', 'wm', 'dismiss-keyguard')
    adb('install', '-r', sys.argv[2]); adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    wait_for_label('Explore what connects us')
    capture(output / 'Home.png')
    for attempt in range(4):
        current = tree()
        flights = node_for(current, 'Find flights')
        if flights is not None:
            break
        if attempt == 3:
            raise RuntimeError('Find flights was unreachable after scrolling the Home screen.')
        # Use the current display bounds; tablet profiles may start in landscape.
        display = max((n for n in current.iter('node') if n.get('package') == PACKAGE),
                      key=lambda n: area(n.attrib['bounds']))
        x1, y1, x2, y2 = rect(display.attrib['bounds'])
        adb('shell', 'input', 'swipe', str((x1+x2)//2), str(y1+3*(y2-y1)//4), str((x1+x2)//2), str(y1+(y2-y1)//3), '450')
    x1, y1, x2, y2 = rect(flights.attrib['bounds'])
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
    wait_for_label('Stays'); wait_for_label('Enter a city name or a three-letter airport code.')
    capture(output / 'Travel.png')


def rect(value):
    return list(map(int, re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', value).groups()))


def area(value):
    x1, y1, x2, y2 = rect(value)
    return (x2 - x1) * (y2 - y1)


if __name__ == '__main__':
    main()
