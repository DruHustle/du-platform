"""Exercise the installed Release APK using its actual accessibility hierarchy."""
import re
from pathlib import Path
import subprocess
import sys
import time
from xml.etree import ElementTree


def adb(*args):
    return subprocess.run(['adb', *args], check=True, capture_output=True, timeout=25).stdout


def wait_for_label(label):
    deadline = time.monotonic() + 65
    while time.monotonic() < deadline:
        adb('shell', 'uiautomator', 'dump', '/sdcard/du-screens.xml')
        document = ElementTree.fromstring(adb('exec-out', 'cat', '/sdcard/du-screens.xml'))
        for node in document.iter('node'):
            if node.get('package') == 'com.diasporaunlocked.app' and label in (node.get('text'), node.get('content-desc')):
                return node
        time.sleep(1)
    raise RuntimeError(f'Installed app did not display {label!r}')


def capture(output):
    data = adb('exec-out', 'screencap', '-p')
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Android did not return a PNG')
    output.write_bytes(data)


def main():
    output = Path(sys.argv[1]); output.mkdir(parents=True, exist_ok=True)
    adb('install', '-r', sys.argv[2]); adb('shell', 'am', 'start', '-W', '-n', 'com.diasporaunlocked.app/.MainActivity')
    flights = wait_for_label('Find flights')
    capture(output / 'Home.png')
    x1, y1, x2, y2 = map(int, re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', flights.attrib['bounds']).groups())
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
    wait_for_label('Stays')
    wait_for_label('Enter a city name or a three-letter airport code.')
    capture(output / 'Travel.png')


if __name__ == '__main__':
    main()
