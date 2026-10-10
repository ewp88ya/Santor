import importlib.util
import json
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

SERVER_PATH = Path(__file__).with_name("server.py")
SPEC = importlib.util.spec_from_file_location("santor_proxy_provisioner", SERVER_PATH)
assert SPEC and SPEC.loader
server = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(server)


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.config_path = Path(self.tempdir.name) / "config.json"
        self.config_path.write_text('{"previous": true}\n')
        self.config_patch = patch.object(server, "XRAY_CONFIG", self.config_path)
        self.config_patch.start()
        self.run_patch = patch.object(server.subprocess, "run")
        self.run_mock = self.run_patch.start()
        self.chown_patch = patch.object(server.os, "chown")
        self.chown_mock = self.chown_patch.start()
        self.socket_patch = patch.object(server.socket, "create_connection")
        self.socket_mock = self.socket_patch.start()
        self.addCleanup(self.config_patch.stop)
        self.addCleanup(self.run_patch.stop)
        self.addCleanup(self.chown_patch.stop)
        self.addCleanup(self.socket_patch.stop)
        self.addCleanup(self.tempdir.cleanup)

    def test_render_sets_container_readable_permissions_and_waits_for_listener(self):
        server.render([{"uuid": "00000000-0000-4000-8000-000000000001", "email": "test@invalid.example"}])

        config = json.loads(self.config_path.read_text())
        clients = config["inbounds"][0]["settings"]["clients"]
        self.assertEqual(len(clients), 1)
        self.assertEqual(clients[0]["id"], "00000000-0000-4000-8000-000000000001")
        self.assertEqual(stat.S_IMODE(self.config_path.stat().st_mode), 0o640)
        self.chown_mock.assert_called_once_with(self.config_path.with_suffix(".tmp"), 0, server.XRAY_CONTAINER_GID)
        self.assertTrue(any(call.args[0][:4] == [server.XRAY_BIN, "run", "-test", "-config"] for call in self.run_mock.call_args_list))
        self.assertTrue(any(call.args[0][:3] == ["docker", "exec", "santor-xray"] for call in self.run_mock.call_args_list))
        self.assertTrue(any(call.args[0][:2] == ["docker", "restart"] for call in self.run_mock.call_args_list))
        self.socket_mock.assert_called_once_with(("127.0.0.1", 10000), timeout=1)

    def test_listener_timeout_restores_previous_config(self):
        previous = self.config_path.read_text()
        self.socket_mock.side_effect = OSError("listener unavailable")
        with patch.object(server.time, "monotonic", side_effect=[0, 31]):
            with self.assertRaisesRegex(RuntimeError, "did not reopen"):
                server.render([])

        self.assertEqual(self.config_path.read_text(), previous)
        self.assertGreaterEqual(self.run_mock.call_count, 4)


if __name__ == "__main__":
    unittest.main()
