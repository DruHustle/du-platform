import XCTest
import UIKit

/// Exercises the actual app through accessibility. No taps use guessed points,
/// no network responses are substituted, and no account/message is submitted.
final class DUNativeSmokeTests: XCTestCase {
    @MainActor private var app: XCUIApplication!
    private var checks: [[String: Any]] = []
    private let tabs = ["Home", "Shop", "Travel", "Assistant", "Account"]

    @MainActor
    override func setUp() async throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Explore what connects us"].waitForExistence(timeout: 40),
                      "The bundled native application did not reach Home.")
    }

    @MainActor
    override func tearDown() async throws {
        attachEvidence("final")
        let data = try JSONSerialization.data(withJSONObject: checks, options: [.prettyPrinted, .sortedKeys])
        let report = XCTAttachment(data: data, uniformTypeIdentifier: "public.json")
        report.name = "du-ios-checks.json"
        report.lifetime = .keepAlways
        add(report)
        app.terminate()
        XCUIDevice.shared.orientation = .portrait
    }

    @MainActor
    func testResponsiveNavigationAndKeyboard() {
        for (name, orientation) in [("portrait", UIDeviceOrientation.portrait),
                                    ("landscape", UIDeviceOrientation.landscapeLeft)] {
            rotate(orientation, name: name)
            checkTabs("\(name)-tabs")
            navigate("Home", text: "Explore what connects us")
            navigate("Shop", text: "Filter by category")
            XCTAssertTrue(app.textFields["Search products"].exists)
            navigate("Travel", text: "Find options")
            XCTAssertTrue(app.textFields["From airport code (e.g. FRA)"].exists)

            navigate("Account", text: "Welcome back")
            let email = unique(.textField, "Email address")
            reveal(email)
            replaceText(email, with: "ios-smoke@example.invalid")
            XCTAssertEqual(email.value as? String, "ios-smoke@example.invalid")
            let password = unique(.secureTextField, "Password")
            reveal(password)
            password.tap()
            password.typeText("keyboard-fixture")
            XCTAssertFalse((password.value as? String ?? "").isEmpty)
            XCTAssertNotEqual(password.value as? String, "Password")
            assertKeyboardAccess(password, action: unique(.button, "Sign in"), name: "\(name)-account-keyboard")
            dismissKeyboard()

            navigate("Assistant", text: "Onesa assistant")
            let message = unique(.textView, "Your message")
            reveal(message)
            replaceText(message, with: "A simulator keyboard check.")
            XCTAssertEqual(message.value as? String, "A simulator keyboard check.")
            assertKeyboardAccess(message, action: unique(.button, "Send message"), name: "\(name)-assistant-keyboard", multiline: true)
            dismissKeyboard()
            checkTabs("\(name)-tabs-after-keyboard")
            attachEvidence(name)
        }
        rotate(.portrait, name: "restored-portrait")
        navigate("Home", text: "Explore what connects us")
        checkTabs("restored-portrait-tabs")
    }

    @MainActor
    private func wait(_ description: String, timeout: TimeInterval = 10, until condition: () -> Bool) {
        let deadline = Date(timeIntervalSinceNow: timeout)
        while !condition() && Date() < deadline {
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1))
        }
        XCTAssertTrue(condition(), description)
    }

    @MainActor
    private func unique(_ type: XCUIElement.ElementType, _ label: String) -> XCUIElement {
        let matches = app.descendants(matching: type).matching(NSPredicate(format: "label == %@", label))
        XCTAssertTrue(matches.firstMatch.waitForExistence(timeout: 15), "Missing \(type): \(label)")
        XCTAssertEqual(matches.count, 1, "Ambiguous accessibility target: \(label)")
        return matches.element(boundBy: 0)
    }

    @MainActor
    private func navigate(_ tab: String, text: String) {
        let target = unique(.button, tab)
        assertControl(target, within: app.frame)
        target.tap()
        XCTAssertTrue(app.staticTexts[text].waitForExistence(timeout: 15), "\(tab) did not show \(text)")
        record("tab-\(tab)", elements: [target])
    }

    @MainActor
    private func rotate(_ orientation: UIDeviceOrientation, name: String) {
        XCUIDevice.shared.orientation = orientation
        wait("Application did not rotate to \(name)") {
            let frame = self.app.frame
            return orientation.isLandscape ? frame.width > frame.height : frame.height > frame.width
        }
        record(name, elements: [])
    }

    @MainActor
    private func checkTabs(_ name: String) {
        wait("The tab bar did not return after the keyboard closed") {
            self.tabs.allSatisfy { self.app.buttons[$0].isHittable }
        }
        let targets = tabs.map { unique(.button, $0) }
        targets.forEach { assertControl($0, within: app.frame) }
        record(name, elements: targets)
    }

    @MainActor
    private func visibleContent() -> CGRect {
        var frame = app.scrollViews.firstMatch.frame.intersection(app.frame)
        if app.keyboards.firstMatch.exists {
            frame.size.height = max(0, min(frame.maxY, app.keyboards.firstMatch.frame.minY) - frame.minY)
        }
        return frame
    }

    private func contains(_ outer: CGRect, _ inner: CGRect) -> Bool {
        !outer.isEmpty && !inner.isEmpty && outer.insetBy(dx: -0.5, dy: -0.5).contains(inner)
    }

    @MainActor
    private func assertControl(_ element: XCUIElement, within viewport: CGRect) {
        XCTAssertTrue(element.isEnabled, "Disabled control: \(element.label)")
        XCTAssertTrue(element.isHittable, "Unreachable control: \(element.label)")
        XCTAssertGreaterThanOrEqual(element.frame.width, 44, "Narrow touch target: \(element.label)")
        XCTAssertGreaterThanOrEqual(element.frame.height, 44, "Short touch target: \(element.label)")
        XCTAssertTrue(contains(viewport, element.frame), "Clipped control \(element.label): \(element.frame), viewport \(viewport)")
    }

    @MainActor
    private func reveal(_ element: XCUIElement) {
        let scroll = app.scrollViews.firstMatch
        for _ in 0..<4 {
            let viewport = visibleContent()
            if element.isHittable && contains(viewport, element.frame) { return }
            if element.frame.minY < viewport.minY { scroll.swipeDown() }
            else { scroll.swipeUp() }
        }
        assertControl(element, within: visibleContent())
    }

    @MainActor
    private func replaceText(_ field: XCUIElement, with value: String) {
        field.tap()
        let previous = field.value as? String ?? ""
        if !previous.isEmpty {
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: previous.count))
        }
        field.typeText(value)
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10), "Typing did not show a software keyboard")
    }

    @MainActor
    private func editingAreaVisible(_ field: XCUIElement, viewport: CGRect, multiline: Bool) -> Bool {
        let visible = field.frame.intersection(viewport)
        return field.isHittable && (multiline
            ? visible.width >= 44 && visible.height >= 44
            : contains(viewport, field.frame))
    }

    @MainActor
    private func assertKeyboardAccess(_ field: XCUIElement, action: XCUIElement, name: String, multiline: Bool = false) {
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 10), "Software keyboard is required")
        let expectedValue = field.value as? String
        XCTAssertNotNil(expectedValue, "The typed input must expose its value")
        let scroll = app.scrollViews.firstMatch
        for _ in 0..<4 {
            XCTAssertTrue(keyboard.exists, "Scrolling dismissed the keyboard; this is not keyboard-clearance evidence")
            let viewport = visibleContent()
            if editingAreaVisible(field, viewport: viewport, multiline: multiline)
                && action.isHittable && contains(viewport, action.frame) { break }
            if action.frame.maxY > viewport.maxY || field.frame.minY > viewport.maxY { scroll.swipeUp() }
            else { scroll.swipeDown() }
        }
        if multiline {
            // Prove editing still works after the bounded scroll. XCTest has no
            // public iOS caret rectangle; retain this typed state for screenshot
            // review rather than claiming a programmatic caret-bound assertion.
            field.typeText("x")
            field.typeText(XCUIKeyboardKey.delete.rawValue)
        }
        XCTAssertTrue(keyboard.exists && keyboard.frame.height > 0, "The software keyboard must still be visible")
        XCTAssertFalse(keyboard.frame.intersection(app.frame).isEmpty,
                       "An offscreen keyboard accessibility element is not visible-keyboard evidence")
        XCTAssertEqual(field.value as? String, expectedValue, "The typed value changed during scrolling")
        if multiline {
            XCTAssertTrue(field.isEnabled)
            XCTAssertTrue(editingAreaVisible(field, viewport: visibleContent(), multiline: true),
                          "The focused multiline editor needs at least 44pt of visible editing area above the keyboard")
        } else {
            assertControl(field, within: visibleContent())
        }
        assertControl(action, within: visibleContent())
        record(name, elements: [field, action, keyboard])
        attachEvidence(name)
    }

    @MainActor
    private func dismissKeyboard() {
        // iOS's native scroll view uses interactive dismissal. This semantic
        // gesture does not submit a form or invoke an unrelated app action.
        for _ in 0..<3 {
            if !app.keyboards.firstMatch.exists { break }
            app.scrollViews.firstMatch.swipeDown()
        }
        wait("Software keyboard did not dismiss") { !self.app.keyboards.firstMatch.exists }
    }

    @MainActor
    private func record(_ name: String, elements: [XCUIElement]) {
        checks.append([
            "name": name,
            "window": NSStringFromCGRect(app.frame),
            "elements": elements.map { ["label": $0.label, "frame": NSStringFromCGRect($0.frame),
                                        "hittable": $0.isHittable, "typedValue": $0.value as? String ?? ""] as [String: Any] }
        ])
    }

    @MainActor
    private func attachEvidence(_ name: String) {
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "\(name)-accessibility.txt"
        hierarchy.lifetime = .keepAlways
        add(hierarchy)
    }
}
