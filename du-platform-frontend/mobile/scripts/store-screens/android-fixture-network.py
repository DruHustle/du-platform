"""Permit HTTP exclusively on the QA phone's adb-reversed loopback fixture."""
from pathlib import Path
manifest=Path('android/app/src/main/AndroidManifest.xml')
s=manifest.read_text()
assert 'android:networkSecurityConfig=' not in s
manifest.write_text(s.replace('<application ','<application android:networkSecurityConfig="@xml/recovery_fixture_network" ',1))
resource=Path('android/app/src/main/res/xml/recovery_fixture_network.xml')
resource.parent.mkdir(exist_ok=True,parents=True)
resource.write_text('<network-security-config><base-config cleartextTrafficPermitted="false"/><domain-config cleartextTrafficPermitted="true"><domain>localhost</domain></domain-config></network-security-config>\n')
