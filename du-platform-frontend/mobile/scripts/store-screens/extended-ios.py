"""Build once and exercise installed support, consent and research journeys, with a receipt for each."""
import importlib.util,json,os,re,subprocess
from pathlib import Path
spec=importlib.util.spec_from_file_location('capture',Path(__file__).with_name('capture-ios.py'))
capture=importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)
tmp=Path(os.environ['RUNNER_TEMP'])/'matched-ios'
devices=json.loads(subprocess.check_output(['xcrun','simctl','list','devices','available','--json']))['devices']
phone=capture.simulator(devices,re.compile(r'iPhone .*Pro Max'))
udid=phone['udid']
subprocess.run(['xcodebuild','build-for-testing','-workspace','ios/DiasporaUnlocked.xcworkspace','-scheme','DUNativeSmoke','-configuration','Release','-sdk','iphonesimulator','-destination','id='+udid,'-derivedDataPath',str(tmp),'ONLY_ACTIVE_ARCH=YES','CODE_SIGN_IDENTITY=-','CODE_SIGNING_ALLOWED=YES','CODE_SIGNING_REQUIRED=YES'],check=True,stdout=subprocess.DEVNULL)
if phone['state']!='Booted':subprocess.run(['xcrun','simctl','boot',udid],check=True)
subprocess.run(['xcrun','simctl','bootstatus',udid,'-b'],check=True)
runfile,=(tmp/'Build'/'Products').glob('*.xctestrun')
res=subprocess.run(['xcodebuild','test-without-building','-xctestrun',str(runfile),'-parallel-testing-enabled','NO','-destination','id='+udid,'-resultBundlePath',str(tmp/'results.xcresult')])
raise SystemExit(res.returncode)
