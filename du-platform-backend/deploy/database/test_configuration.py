"""Configuration-only MySQL candidate checks; never start an image or database."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

PREPARED = Path(__file__).resolve().parent
ORACLE = PREPARED.parent / "oracle/compose.yaml"
REQUIRE_COMPOSE = "--require-compose" in sys.argv
if REQUIRE_COMPOSE:
    sys.argv.remove("--require-compose")


def document(name):
    return json.loads((PREPARED / name).read_text())


def environment(name):
    values = {}
    for line in (PREPARED / name).read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or key in values:
            raise ValueError("Invalid or duplicate example environment key")
        values[key] = value
    return values


class MySQLSourceBoundaries(unittest.TestCase):
    def setUp(self):
        self.database = document("compose.database.yaml")
        self.mysql = self.database["services"]["mysql"]
        self.overlay = document("compose.application-database.yaml")

    def test_candidate_is_separate_opt_in_and_private(self):
        self.assertEqual(set(self.database["services"]), {"mysql"})
        self.assertEqual(self.mysql["profiles"], ["candidate-database"])
        self.assertNotIn("ports", self.mysql)
        self.assertNotIn("network_mode", self.mysql)
        self.assertNotIn("privileged", self.mysql)
        self.assertEqual(set(self.mysql["networks"]), {"database"})
        self.assertTrue(self.database["networks"]["database"]["internal"])
        self.assertTrue(self.mysql["read_only"])
        self.assertEqual(self.mysql["cap_drop"], ["ALL"])
        self.assertIn("no-new-privileges:true", self.mysql["security_opt"])

    def test_retained_storage_and_identity_budgets_have_no_defaults(self):
        volume = self.database["volumes"]["mysql_data"]
        self.assertTrue(volume["external"])
        self.assertIn("DU_MYSQL_VOLUME:?", volume["name"])
        mount = next(v for v in self.mysql["volumes"] if v["type"] == "volume")
        self.assertEqual(mount["target"], "/var/lib/mysql")
        self.assertIn("--datadir=" + mount["target"], self.mysql["command"])
        for key in ("image", "platform", "user", "mem_limit", "cpus"):
            self.assertIn(":?", self.mysql[key])
        for prefix in ("--max-connections=", "--innodb-buffer-pool-size="):
            setting = next(v for v in self.mysql["command"] if v.startswith(prefix))
            self.assertIn(":?", setting)
        self.assertIn("@sha256:", environment("database.env.example")["DU_MYSQL_IMAGE"])

    def test_bootstrap_is_local_admin_only_and_uses_a_secret_file(self):
        self.assertEqual(self.mysql["environment"], {
            "MYSQL_ROOT_HOST": "localhost",
            "MYSQL_ROOT_PASSWORD_FILE": "/run/secrets/mysql_bootstrap_password",
        })
        self.assertEqual(self.mysql["secrets"], ["mysql_bootstrap_password"])
        self.assertIn("DU_MYSQL_PASSWORD_FILE:?",
                      self.database["secrets"]["mysql_bootstrap_password"]["file"])
        self.assertNotIn("MYSQL_USER", self.mysql["environment"])
        self.assertNotIn("MYSQL_ALLOW_EMPTY_PASSWORD", self.mysql["environment"])
        self.assertNotIn("MYSQL_RANDOM_ROOT_PASSWORD", self.mysql["environment"])

    def test_network_tls_and_file_permissions_do_not_silently_downgrade(self):
        for setting in ("--require-secure-transport=ON", "--tls-version=TLSv1.2,TLSv1.3",
                        "--ssl-ca=/run/mysql-tls/ca.crt",
                        "--ssl-cert=/run/mysql-tls/server.crt",
                        "--ssl-key=/run/mysql-tls/server.key",
                        "--secure-file-priv=NULL", "--mysqlx=OFF"):
            self.assertIn(setting, self.mysql["command"])
        for mount in self.mysql["volumes"]:
            if mount["type"] == "bind":
                self.assertTrue(mount["read_only"])
                self.assertFalse(mount["bind"]["create_host_path"])

    def test_overlay_changes_only_private_network_and_public_ca(self):
        self.assertEqual(set(self.overlay["services"]), {"app"})
        app = self.overlay["services"]["app"]
        self.assertEqual(set(app), {"networks", "volumes"})
        self.assertEqual(set(app["networks"]), {"database"})
        self.assertTrue(self.overlay["networks"]["database"]["external"])
        self.assertEqual(self.overlay["networks"]["database"]["name"],
                         self.database["networks"]["database"]["name"])
        mount, = app["volumes"]
        self.assertEqual(mount["target"], "/run/du-db-ca/root.crt")
        self.assertTrue(mount["read_only"])
        self.assertFalse(mount["bind"]["create_host_path"])
        candidate = environment("application.env.example")
        self.assertEqual(candidate["NODE_ENV"], "production")
        self.assertEqual(candidate["DATABASE_PROVIDER"], "mysql")
        self.assertTrue(candidate["DATABASE_URL"].startswith("mysql://"))
        self.assertEqual(candidate["MYSQL_CA_CERT_PATH"], mount["target"])
        self.assertNotIn("MYSQL_ROOT_PASSWORD", candidate)


class MySQLComposeConfigurationOnly(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not shutil.which("docker"):
            if REQUIRE_COMPOSE:
                raise AssertionError("Docker Compose is required for this CI configuration check")
            raise unittest.SkipTest("Docker Compose unavailable; use --require-compose in CI")

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        temporary = Path(self.temporary.name)
        tls = temporary / "tls"
        tls.mkdir()
        for name in ("ca.crt", "server.crt", "server.key"):
            (tls / name).write_text("synthetic-config-fixture-not-a-certificate\n")
        password = temporary / "bootstrap-password"
        password.write_text("synthetic-config-fixture-not-a-production-secret\n")
        password.chmod(0o600)
        self.env = {key: os.environ[key] for key in ("PATH", "HOME") if key in os.environ}
        self.env["COMPOSE_DISABLE_ENV_FILE"] = "1"
        self.env.update({
            "DU_MYSQL_IMAGE": "mysql@sha256:" + "0" * 64,
            "DU_MYSQL_PLATFORM": "linux/amd64",
            "DU_MYSQL_UID": "10001",
            "DU_MYSQL_GID": "10001",
            "DU_MYSQL_MEMORY_LIMIT": "512m",
            "DU_MYSQL_CPU_LIMIT": "1",
            "DU_MYSQL_BUFFER_POOL_SIZE": "128M",
            "DU_MYSQL_MAX_CONNECTIONS": "40",
            "DU_MYSQL_VOLUME": "du-fixture-retained-volume",
            "DU_MYSQL_PASSWORD_FILE": str(password),
            "DU_MYSQL_TLS_DIR": str(tls),
            "DU_DATABASE_CA_FILE": str(tls / "ca.crt"),
            "APP_IMAGE": "example.invalid/application:configuration-fixture",
        })

    def compose(self, files, *, env=None):
        command = ["docker", "compose", "--env-file", os.devnull]
        for file in files:
            command += ["-f", str(file)]
        command += ["--profile", "candidate-database", "config", "--format", "json"]
        return subprocess.run(command, env=self.env if env is None else env,
                              capture_output=True, text=True, timeout=30, check=False)

    def test_candidate_renders_without_pulling_or_starting_mysql(self):
        result = self.compose([PREPARED / "compose.database.yaml"])
        self.assertEqual(result.returncode, 0, result.stderr)
        rendered = json.loads(result.stdout)
        self.assertFalse(rendered["services"]["mysql"].get("ports"))
        self.assertEqual(rendered["services"]["mysql"]["environment"]["MYSQL_ROOT_HOST"], "localhost")
        self.assertTrue(rendered["volumes"]["mysql_data"]["external"])
        self.assertEqual(rendered["volumes"]["mysql_data"]["name"], "du-fixture-retained-volume")
        self.assertTrue(rendered["networks"]["database"]["internal"])

    def test_a_missing_reviewed_image_fails_closed(self):
        env = dict(self.env)
        del env["DU_MYSQL_IMAGE"]
        result = self.compose([PREPARED / "compose.database.yaml"], env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DU_MYSQL_IMAGE", result.stderr)

    def test_overlay_preserves_real_application_ingress_port_and_external_primary(self):
        retained = {
            "NODE_ENV": "production", "DATABASE_PROVIDER": "aiven",
            "AIVEN_MYSQL_URL": "mysql://fixture:fixture@existing-primary.invalid/retained",
            "AIVEN_CA_CERT": "synthetic-retained-ca-fixture",
        }
        runtime = Path(self.temporary.name) / "retained-runtime.json"
        runtime.write_text(json.dumps({"services": {"app": {"environment": retained}}}))
        result = self.compose([ORACLE, runtime, PREPARED / "compose.application-database.yaml"])
        self.assertEqual(result.returncode, 0, result.stderr)
        rendered = json.loads(result.stdout)
        app = rendered["services"]["app"]
        self.assertEqual(app["environment"], retained)
        self.assertEqual(app["image"], self.env["APP_IMAGE"])
        self.assertEqual(set(app["networks"]), {"ingress", "database"})
        self.assertIn("du-platform-api", app["networks"]["ingress"]["aliases"])
        self.assertEqual(rendered["networks"]["ingress"]["name"], "du-platform-ingress")
        self.assertTrue(rendered["networks"]["ingress"]["external"])
        port, = app["ports"]
        self.assertEqual(port["host_ip"], "127.0.0.1")
        self.assertEqual(str(port["published"]), "11000")
        self.assertEqual(port["target"], 10000)


if __name__ == "__main__":
    unittest.main()
