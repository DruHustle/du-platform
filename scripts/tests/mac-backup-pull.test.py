import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


def load(name, path):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module


pull=load('pull', 'scripts/operations/mac-backup-pull.py')
installer=load('installer', 'scripts/operations/install-mac-backup.py')


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name).resolve()
        self.now=pull.utcnow();stamp=self.now.strftime('%Y%m%dT%H%M%SZ')
        self.content=b'synthetic-encrypted-fixture-not-a-production-dump'
        self.item={'name':stamp+'.sql.gpg','size':len(self.content),'sha256':hashlib.sha256(self.content).hexdigest()}
        self.item['recoveryEvidence']={'sourceStableDuringDump':True,'schemaAndRowHashesMatch':True,'encryptedArchiveRoundTrip':True,'applicationRecoveryTested':True,'plaintextDumpWritten':False,'liveWrites':False,'archiveSha256':self.item['sha256'],'archiveBytes':self.item['size']}
        test=self
        class Remote:
            calls=0
            def metadata(self,command):
                self.calls+=1
                return [test.item]
            def download(self,name,output):output.write(test.content)
        self.remote=Remote();self.config={'destination':str(self.root),'intervalHours':24,'sshHost':'fixture@example.test'}
        self.darwin=patch.object(pull.platform,'system',return_value='Darwin');self.darwin.start()
        # shasum is native on the actual Mac; Python verifies the digest in all environments.
        self.native=patch.object(pull.subprocess,'run');self.native.start()
    def tearDown(self):
        self.native.stop();self.darwin.stop();self.tmp.cleanup()
    def status(self):return json.loads((self.root/'BACKUP-STATUS.json').read_text())
    def test_atomic_success_due_check_and_quoted_paths(self):
        self.root=self.root/'Folder with spaces';self.root.mkdir();self.config['destination']=str(self.root)
        result=pull.pull(self.config,remote=self.remote,now=self.now)
        saved=Path(result['savedDirectory']);self.assertEqual((saved/self.item['name']).read_bytes(),self.content)
        self.assertEqual(os.stat(saved).st_mode&0o777,0o700)
        self.assertTrue(all(p.stat().st_mode&0o777==0o600 for p in saved.iterdir()))
        self.assertEqual(pull.pull(self.config,remote=self.remote,now=self.now+dt.timedelta(hours=2))['result'],'not_due')
        self.assertEqual(self.remote.calls,2)
        self.assertIn("cd '", (saved/'RECOVERY-INSTRUCTIONS.txt').read_text())
    def test_failed_download_keeps_good_copies_and_last_success(self):
        good=pull.pull(self.config,remote=self.remote,now=self.now)
        self.remote.download=lambda name,output:output.write(b'corrupt')
        with self.assertRaises(RuntimeError):pull.pull(self.config,force=True,remote=self.remote,now=self.now)
        self.assertEqual(self.status()['lastSuccessUtc'],good['lastSuccessUtc'])
        self.assertEqual(self.status()['failureCode'],'verification_failed')
        self.assertTrue(Path(good['savedDirectory']).is_dir());self.assertFalse(list(self.root.glob('.download-*')))
    def test_offline_failure_is_redacted_and_retries_when_connected(self):
        original=self.remote.metadata
        self.remote.metadata=lambda command:(_ for _ in ()).throw(RuntimeError('secret-fake-credential'))
        with self.assertRaises(RuntimeError):pull.pull(self.config,remote=self.remote,now=self.now)
        self.assertNotIn('secret-fake-credential',json.dumps(self.status()))
        self.remote.metadata=original
        self.assertEqual(pull.pull(self.config,remote=self.remote,now=self.now)['state'],'success')
    def test_concurrent_run_does_not_start_snapshot(self):
        state=self.root/'.mac-pull';state.mkdir()
        with (state/'pull.lock').open('w') as lock:
            pull.fcntl.flock(lock,pull.fcntl.LOCK_EX|pull.fcntl.LOCK_NB)
            self.assertEqual(pull.pull(self.config,remote=self.remote)['result'],'already_running')
        self.assertEqual(self.remote.calls,0)
    def test_refuses_non_mac_stale_snapshot_and_unverified_restore(self):
        with patch.object(pull.platform,'system',return_value='Linux'):
            with self.assertRaises(ValueError):pull.pull(self.config,remote=self.remote)
        self.item['recoveryEvidence']['plaintextDumpWritten']=True
        with self.assertRaises(RuntimeError):pull.pull(self.config,remote=self.remote,now=self.now)
        self.assertFalse(list(self.root.glob('.download-*')))
    def test_launch_agent_has_wake_login_catchup_and_no_shell_quoting(self):
        plist=installer.launch_agent('/usr/bin/python3',Path('/Mac folder/pull.py'),Path('/Mac folder/config.json'))
        self.assertEqual(plist['ProgramArguments'][1],'/Mac folder/pull.py')
        self.assertTrue(plist['RunAtLoad']);self.assertEqual(plist['StartInterval'],3600)
        self.assertEqual(plist['StartCalendarInterval'],{'Hour':3,'Minute':15})
    def test_source_changed_after_download_is_not_promoted(self):
        original=self.remote.metadata
        def metadata(command):
            rows=original(command)
            return [{**rows[0],'size':999}] if command=='inventory' else rows
        self.remote.metadata=metadata
        with self.assertRaises(RuntimeError):pull.pull(self.config,remote=self.remote,now=self.now)
        self.assertFalse(list(self.root.glob('20*')))
    def test_stale_snapshot_and_symlink_destinations_are_rejected(self):
        self.item['name']='20200101T000000Z.sql.gpg'
        with self.assertRaises(RuntimeError):pull.pull(self.config,remote=self.remote,now=self.now)
        link=self.root/'link';link.symlink_to(self.root,target_is_directory=True)
        with self.assertRaises(ValueError):pull.pull({**self.config,'destination':str(link)},remote=self.remote)
    def test_existing_good_directory_is_never_overwritten(self):
        good=pull.pull(self.config,remote=self.remote,now=self.now)
        with self.assertRaises(RuntimeError):pull.pull(self.config,force=True,remote=self.remote,now=self.now)
        self.assertEqual((Path(good['savedDirectory'])/self.item['name']).read_bytes(),self.content)
    def test_ssh_requires_pinned_host_and_noninteractive_authentication(self):
        remote=pull.Remote(self.config)
        self.assertIn('StrictHostKeyChecking=yes',remote.args)
        self.assertIn('BatchMode=yes',remote.args)
        with self.assertRaises(ValueError):pull.Remote({**self.config,'sshHost':'-oProxyCommand=unsafe'})


if __name__=='__main__':unittest.main()
