"""Submit synthetic alert and support forms from the installed loopback QA build."""
import argparse
import importlib.util
import os
from pathlib import Path
from uuid import UUID
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location("live_android", Path(__file__).with_name("live-android.py"))
live = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)

PORT = "tcp:18765"
API = b"http://127.0.0.1:18765/api"
RECEIPT_PREFIX = "Your message was received. Reference: "


def enter(label, value):
    # Android's input text command encodes a space as %s.
    live.type_in_field(label, value.replace(" ", "%s"))


def read_outcome(label, prefix=False):
    # After submitting, the form can shrink and place its receipt above the old button.
    try:
        return live.find(label, timeout=5, prefix=prefix)
    except RuntimeError:
        pass
    document = live.screen.tree()
    display = max((node for node in document.iter("node")
                   if node.get("package") == live.screen.PACKAGE),
                  key=lambda node: live.screen.area(node.attrib["bounds"]))
    left, top, right, bottom = live.screen.rect(display.attrib["bounds"])
    middle = str((left + right) // 2)
    for _ in range(2):
        live.screen.adb("shell", "input", "swipe", middle, str(top + (bottom-top)//4),
                        middle, str(top + 3*(bottom-top)//4), "300")
    return live.find(label, scroll=True, prefix=prefix)


def submit_alert():
    live.open_app_link("shop/product/qa-visitor-product")
    live.find("Installed QA product")
    live.find(
        "Confirm your email to receive one alert when this product becomes available. "
        "Cancel using the link in the email. Newsletter signup is separate.",
        scroll=True,
    )
    enter("Email address", "visitor-alert@example.test")
    live.tap(live.find("Email me when available", scroll=True, actionable=True))
    read_outcome("If confirmation is needed, we’ll email you a link. Check your inbox and spam folder.")
    print("PASS installed Android product alert reached the confirmation email instructions", flush=True)


def submit_support():
    live.open_home()
    live.tap(live.find("Contact us", scroll=True, actionable=True))
    live.find("Contact and help")
    enter("Full name", "QA Visitor")
    enter("Email address", "visitor-support@example.test")
    enter("Subject", "Installed QA")
    enter("Message", "Please confirm receipt of this test support message.")
    live.tap(live.find("Send message", scroll=True, actionable=True))
    receipt = read_outcome(RECEIPT_PREFIX, prefix=True)
    text = next(receipt.get(key) for key in ("text", "content-desc")
                if receipt.get(key, "").startswith(RECEIPT_PREFIX))
    reference = text.removeprefix(RECEIPT_PREFIX)
    parsed = UUID(reference)
    if str(parsed) != reference or parsed.version != 4:
        raise AssertionError("The support receipt must display the server-confirmed request UUID")
    print(f"PASS installed Android support receipt {reference}", flush=True)
    return reference


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    args = parser.parse_args()
    # Requiring the QA endpoint in the compiled bundle prevents using a store APK by mistake.
    with ZipFile(args.apk) as package:
        if API not in package.read("assets/index.android.bundle"):
            raise ValueError("Expected a QA APK compiled with the loopback API")
    adb = live.screen.adb
    adb("reverse", PORT, PORT)
    try:
        adb("install", "-r", str(args.apk))
        adb("shell", "pm", "clear", live.screen.PACKAGE)
        live.open_home()
        submit_alert()
        reference = submit_support()
        (Path(os.environ["RUNNER_TEMP"]) / "installed-support-id").write_text(reference + "\n")
    finally:
        adb("reverse", "--remove", PORT)


if __name__ == "__main__":
    main()
