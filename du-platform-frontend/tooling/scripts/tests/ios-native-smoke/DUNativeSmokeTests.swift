import XCTest
import UIKit

/// Exercises the actual app through accessibility. No taps use guessed points,
/// no network responses are substituted, and no account/message is submitted.
final class DUNativeSmokeTests: XCTestCase {
    @MainActor private var app: XCUIApplication!
    private var checks: [[String: Any]] = []
    private let tabs = ["Home", "Shop", "Travel", "Assistant", "Account"]
    private var dismissedTypingTutorial = false
    private var pendingPasswordPromptFor: String?

    @MainActor
    override func setUp() async throws {
        continueAfterFailure = false
        app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        XCTAssertTrue(existsOrWait(app.staticTexts["Explore what connects us"], timeout: 40),
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
            let accountScroll = contentScrollView(containing: email)
            reveal(email, in: accountScroll)
            replaceText(email, with: "ios-smoke@example.invalid")
            XCTAssertEqual(email.value as? String, "ios-smoke@example.invalid")
            let password = unique(.secureTextField, "Password")
            reveal(password, in: accountScroll)
            replaceText(password, with: "keyboard-fixture", secure: true)
            XCTAssertFalse((password.value as? String ?? "").isEmpty)
            XCTAssertNotEqual(password.value as? String, "Password")
            XCTAssertEqual((password.value as? String)?.count, "keyboard-fixture".count)
            assertKeyboardAccess(password, action: unique(.button, "Sign in"), in: accountScroll,
                                 name: "\(name)-account-keyboard")
            // iOS can offer to save these fixture credentials after leaving
            // the form. Allow one observed prompt for this Account visit.
            pendingPasswordPromptFor = name
            dismissKeyboard(in: accountScroll, avoiding: password)
            _ = declinePasswordPrompt(preserving: password, expected: "keyboard-fixture", secure: true)

            navigate("Assistant", text: "Onesa assistant")
            let message = unique(.textView, "Your message")
            let assistantScroll = contentScrollView(containing: message)
            reveal(message, in: assistantScroll)
            replaceText(message, with: "A simulator keyboard check.")
            XCTAssertEqual(message.value as? String, "A simulator keyboard check.")
            assertKeyboardAccess(message, action: unique(.button, "Send message"), in: assistantScroll,
                                 name: "\(name)-assistant-keyboard", multiline: true)
            dismissKeyboard(in: assistantScroll, avoiding: message)
            checkTabs("\(name)-tabs-after-keyboard")
            attachEvidence(name)
            pendingPasswordPromptFor = nil
        }
        rotate(.portrait, name: "restored-portrait")
        navigate("Home", text: "Explore what connects us")
        checkTabs("restored-portrait-tabs")
    }

    @MainActor
    private func wait(_ description: String, timeout: TimeInterval = 10, until condition: () -> Bool) {
        let deadline = Date(timeIntervalSinceNow: timeout)
        repeat {
            if condition() { return }
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1))
        } while Date() < deadline
        XCTAssertTrue(condition(), description)
    }

    @MainActor
    private func existsOrWait(_ element: XCUIElement, timeout: TimeInterval = 15) -> Bool {
        element.exists || element.waitForExistence(timeout: timeout)
    }

    @MainActor
    private func unique(_ type: XCUIElement.ElementType, _ label: String) -> XCUIElement {
        let matches = app.descendants(matching: type).matching(NSPredicate(format: "label == %@", label))
        XCTAssertTrue(existsOrWait(matches.firstMatch), "Missing \(type): \(label)")
        XCTAssertEqual(matches.count, 1, "Ambiguous accessibility target: \(label)")
        return matches.element(boundBy: 0)
    }

    @MainActor
    private func navigate(_ tab: String, text: String) {
        let target = unique(.button, tab)
        assertControl(target, within: app.frame)
        target.tap()
        XCTAssertTrue(existsOrWait(app.staticTexts[text]), "\(tab) did not show \(text)")
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
    private func contentScrollView(containing field: XCUIElement) -> XCUIElement {
        // Keyboard windows also expose scroll views. Select the unique app
        // window and content scroll view that actually contain this form.
        let type = field.elementType
        let label = field.label
        let windows = app.windows.containing(type, identifier: label)
        XCTAssertEqual(windows.count, 1, "The form must belong to one app window: \(label)")
        let scrolls = windows.element(boundBy: 0).scrollViews.containing(type, identifier: label)
        XCTAssertEqual(scrolls.count, 1, "The form must belong to one content scroll view: \(label)")
        return scrolls.element(boundBy: 0)
    }

    @MainActor
    private func visibleKeyboardAccessories() -> [XCUIElement] {
        let window = app.frame
        return app.otherElements.matching(NSPredicate(format: "identifier == %@", "SystemInputAssistantView"))
            .allElementsBoundByIndex.filter { !$0.frame.intersection(window).isEmpty }
    }

    @MainActor
    private func keyboardObstructionFrame() -> CGRect? {
        guard var frame = visibleKeyboardFrame() else { return nil }
        for accessory in visibleKeyboardAccessories() {
            frame = frame.union(accessory.frame)
        }
        return frame.intersection(app.frame)
    }

    @MainActor
    private func visibleContent(in scroll: XCUIElement) -> CGRect {
        var frame = scroll.frame.intersection(app.frame)
        if let keyboard = keyboardObstructionFrame() {
            frame.size.height = max(0, min(frame.maxY, keyboard.minY) - frame.minY)
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
        let frame = element.frame
        XCTAssertGreaterThanOrEqual(frame.width, 44, "Narrow touch target: \(element.label)")
        XCTAssertGreaterThanOrEqual(frame.height, 44, "Short touch target: \(element.label)")
        XCTAssertTrue(contains(viewport, frame), "Clipped control \(element.label): \(frame), viewport \(viewport)")
    }

    @MainActor
    private func scrollContent(_ scroll: XCUIElement, avoiding field: XCUIElement, up: Bool) {
        let viewport = visibleContent(in: scroll)
        let fieldFrame = field.frame
        let scrollFrame = scroll.frame
        let left = max(0, min(viewport.maxX, fieldFrame.minX) - viewport.minX)
        let right = max(0, viewport.maxX - max(viewport.minX, fieldFrame.maxX))
        XCTAssertFalse(viewport.isEmpty, "There is no visible app content available for a scroll gesture")
        XCTAssertGreaterThan(max(left, right), 0, "A scroll gesture needs a visible gutter outside the editor")
        let x = left >= right ? viewport.minX + left / 2 : viewport.maxX - right / 2
        let top = viewport.minY + viewport.height * 0.2
        let bottom = viewport.minY + viewport.height * 0.8
        let start = CGPoint(x: x, y: up ? bottom : top)
        let end = CGPoint(x: x, y: up ? top : bottom)
        XCTAssertTrue(viewport.contains(start) && viewport.contains(end),
                      "Scroll endpoints must stay inside the measured visible app viewport")
        // The element-relative drag stays above the entire keyboard/accessory
        // and outside the editor, which may have its own internal scroll view.
        let origin = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
        let from = origin.withOffset(CGVector(dx: start.x - scrollFrame.minX, dy: start.y - scrollFrame.minY))
        let to = origin.withOffset(CGVector(dx: end.x - scrollFrame.minX, dy: end.y - scrollFrame.minY))
        checks.append(["name": up ? "content-scroll-up" : "content-scroll-down",
                       "field": field.label, "scroll": rectangle(scrollFrame), "viewport": rectangle(viewport),
                       "start": ["x": Double(start.x), "y": Double(start.y)],
                       "end": ["x": Double(end.x), "y": Double(end.y)]])
        from.press(forDuration: 0.1, thenDragTo: to)
    }

    @MainActor
    private func reveal(_ element: XCUIElement, in scroll: XCUIElement) {
        if pendingPasswordPromptFor != nil {
            _ = declinePasswordPrompt(preserving: element, expected: element.value as? String ?? "",
                                      secure: element.elementType == .secureTextField)
        }
        for _ in 0..<4 {
            let viewport = visibleContent(in: scroll)
            if element.isHittable && contains(viewport, element.frame) { return }
            scrollContent(scroll, avoiding: element, up: element.frame.minY >= viewport.minY)
        }
        assertControl(element, within: visibleContent(in: scroll))
    }

    @MainActor
    private func visibleKeyboardFrame() -> CGRect? {
        let keyboard = app.keyboards.firstMatch
        guard keyboard.exists else { return nil }
        let frame = keyboard.frame
        return frame.height > 0 && !frame.intersection(app.frame).isEmpty ? frame : nil
    }

    @MainActor
    private func typingTutorials() -> XCUIElementQuery {
        app.otherElements.matching(NSPredicate(format: "identifier == %@", "UIContinuousPathIntroductionView"))
    }

    @MainActor
    private func passwordPrompt() -> XCUIElement? {
        let title = NSPredicate(format: "label == %@", "Save Password?")
        let matches = app.sheets.matching(title).allElementsBoundByIndex
            + app.alerts.matching(title).allElementsBoundByIndex
        guard !matches.isEmpty else { return nil }
        XCTAssertEqual(matches.count, 1, "The observed password-saving prompt must be unique")
        return matches[0]
    }

    @MainActor
    private func inputMatches(_ field: XCUIElement, expected: String, secure: Bool = false) -> Bool {
        guard let observed = field.value else { return expected.isEmpty }
        guard let actual = observed as? String else { return false }
        return secure ? actual.count == expected.count : actual == expected
    }

    @MainActor
    private func declinePasswordPrompt(preserving field: XCUIElement, expected: String, secure: Bool = false) -> Bool {
        guard let prompt = passwordPrompt() else { return false }
        guard let phase = pendingPasswordPromptFor else {
            XCTFail("A password-saving prompt outside its Account visit, or a repeated prompt, is unexpected")
            return false
        }
        let title = prompt.staticTexts.matching(NSPredicate(format: "label == %@", "Save Password?"))
        let body = prompt.staticTexts.matching(NSPredicate(format: "label == %@",
            "Securely store your password so it’s filled automatically the next time you need it."))
        let cancel = prompt.buttons.matching(NSPredicate(format: "label == %@", "Not Now"))
        let save = prompt.buttons.matching(NSPredicate(format: "label == %@", "Save"))
        XCTAssertEqual(title.count, 1)
        XCTAssertEqual(body.count, 1, "Only the observed password-saving prompt may be declined")
        XCTAssertEqual(cancel.count, 1)
        XCTAssertEqual(save.count, 1)
        XCTAssertEqual(prompt.buttons.count, 2, "Unknown prompt actions must not be dismissed")
        let button = cancel.element(boundBy: 0)
        XCTAssertFalse(prompt.frame.intersection(app.frame).isEmpty)
        XCTAssertTrue(button.isEnabled && button.isHittable)
        XCTAssertTrue(contains(app.frame, button.frame))
        XCTAssertTrue(inputMatches(field, expected: expected, secure: secure),
                      "The acknowledged input changed before the password prompt was declined")
        record("\(phase)-password-prompt-before", elements: [prompt, button, field])
        attachEvidence("\(phase)-password-prompt-before")
        pendingPasswordPromptFor = nil
        button.tap()
        wait("The known password prompt did not disappear", timeout: 5) { !prompt.exists }
        XCTAssertTrue(inputMatches(field, expected: expected, secure: secure),
                      "Declining the password prompt must preserve the acknowledged input")
        record("\(phase)-password-prompt-after", elements: [field])
        attachEvidence("\(phase)-password-prompt-after")
        return true
    }

    @MainActor
    private func resumePasswordInterruptedInput(_ field: XCUIElement, expected: String, secure: Bool = false) {
        guard declinePasswordPrompt(preserving: field, expected: expected, secure: secure) else { return }
        // Only the observed prompt authorizes refocusing; this never types,
        // repairs a value, or retries an event already sent to the input.
        field.tap()
        waitForTypingKeyboard(refocusing: field, preserving: expected, secure: secure)
        XCTAssertTrue(inputMatches(field, expected: expected, secure: secure),
                      "Refocusing after the password prompt must preserve the acknowledged input")
    }

    @MainActor
    private func dismissKnownTypingTutorial() -> Bool {
        let tutorials = typingTutorials()
        guard tutorials.firstMatch.exists else { return false }
        XCTAssertEqual(tutorials.count, 1, "The observed iOS keyboard tutorial must be unique")
        XCTAssertFalse(dismissedTypingTutorial, "The first-use keyboard tutorial must not recur")
        let tutorial = tutorials.element(boundBy: 0)
        let instruction = tutorial.staticTexts.matching(NSPredicate(format: "label == %@",
            "Speed up your typing by sliding your finger across the letters to compose a word."))
        let buttons = tutorial.buttons.matching(NSPredicate(format: "label == %@", "Continue"))
        XCTAssertEqual(instruction.count, 1, "Only the observed QuickPath introduction may be dismissed")
        XCTAssertEqual(buttons.count, 1, "The known tutorial must contain its own Continue button")
        let button = buttons.element(boundBy: 0)
        XCTAssertFalse(tutorial.frame.intersection(app.frame).isEmpty)
        XCTAssertFalse(instruction.element(boundBy: 0).frame.intersection(app.frame).isEmpty)
        XCTAssertTrue(button.isEnabled && button.isHittable)
        XCTAssertTrue(contains(app.frame, button.frame))
        record("keyboard-tutorial-before", elements: [tutorial, button])
        attachEvidence("keyboard-tutorial-before")
        dismissedTypingTutorial = true
        button.tap()
        wait("The known keyboard tutorial did not disappear", timeout: 5) { !tutorial.exists }
        record("keyboard-tutorial-after", elements: [])
        attachEvidence("keyboard-tutorial-after")
        return true
    }

    @MainActor
    private func waitForKeyboardOrInterruption() -> Bool {
        var interruptionObserved = false
        var previous: CGRect?
        var settledSince = Date()
        wait("A visible software keyboard must settle before typing") {
            if self.typingTutorials().firstMatch.exists || self.passwordPrompt() != nil {
                interruptionObserved = true
                return true
            }
            guard let frame = self.keyboardObstructionFrame() else {
                previous = nil
                settledSince = Date()
                return false
            }
            if previous != frame {
                previous = frame
                settledSince = Date()
                return false
            }
            return Date().timeIntervalSince(settledSince) >= 0.2
        }
        return interruptionObserved
    }

    @MainActor
    private func waitForTypingKeyboard(refocusing field: XCUIElement, preserving expected: String, secure: Bool = false) {
        // At most the once-only typing introduction and this Account visit's
        // password prompt may interrupt a settling phase. Neither is a retry.
        for phase in 0..<3 {
            guard waitForKeyboardOrInterruption() else { return }
            XCTAssertLessThan(phase, 2, "Unexpected repeated input interruptions")
            XCTAssertTrue(inputMatches(field, expected: expected, secure: secure),
                          "An input interruption must not replace the acknowledged value")
            if !dismissKnownTypingTutorial() {
                XCTAssertTrue(declinePasswordPrompt(preserving: field, expected: expected, secure: secure))
            }
            // Evidence and acknowledgment occur outside the keyboard deadline.
            // Refocus only after an observed prompt, without sending any text.
            field.tap()
            XCTAssertTrue(inputMatches(field, expected: expected, secure: secure))
        }
        XCTFail("The software keyboard did not return after the bounded input interruptions")
    }

    @MainActor
    private func typeOnce(_ character: String, into field: XCUIElement, from previous: String,
                          expecting value: String, secure: Bool = false) {
        if pendingPasswordPromptFor != nil {
            resumePasswordInterruptedInput(field, expected: previous, secure: secure)
        }
        var keyboardFrame = visibleKeyboardFrame()
        if keyboardFrame == nil && passwordPrompt() != nil {
            resumePasswordInterruptedInput(field, expected: previous, secure: secure)
            keyboardFrame = visibleKeyboardFrame()
        }
        XCTAssertNotNil(keyboardFrame, "The software keyboard disappeared before typing")
        field.typeText(character)
        // Acknowledgment observes each event; it never resends it or repairs the
        // text. Secure inputs expose only a masked value, so check its length.
        var passwordPromptObserved = false
        wait("Typed input did not acknowledge the expected \(secure ? "masked length" : "exact prefix") of \(value.count)", timeout: 3) {
            guard self.visibleKeyboardFrame() != nil else {
                passwordPromptObserved = self.passwordPrompt() != nil
                return passwordPromptObserved
            }
            return self.inputMatches(field, expected: value, secure: secure)
        }
        if passwordPromptObserved {
            // The event was already sent. Even if a prompt arrived during its
            // acknowledgment, the exact NEW value must appear without replay.
            wait("An interrupted input event must still acknowledge its exact value", timeout: 3) {
                self.inputMatches(field, expected: value, secure: secure)
            }
            resumePasswordInterruptedInput(field, expected: value, secure: secure)
        }
        XCTAssertTrue(inputMatches(field, expected: value, secure: secure))
    }

    @MainActor
    private func replaceText(_ field: XCUIElement, with value: String, secure: Bool = false) {
        var expected = field.value as? String ?? ""
        _ = dismissKnownTypingTutorial()
        if pendingPasswordPromptFor != nil {
            _ = declinePasswordPrompt(preserving: field, expected: expected, secure: secure)
        }
        field.tap()
        waitForTypingKeyboard(refocusing: field, preserving: expected, secure: secure)
        while !expected.isEmpty {
            let previous = expected
            expected.removeLast()
            typeOnce(XCUIKeyboardKey.delete.rawValue, into: field, from: previous, expecting: expected, secure: secure)
        }
        for character in value {
            let previous = expected
            expected.append(character)
            typeOnce(String(character), into: field, from: previous, expecting: expected, secure: secure)
        }
    }

    @MainActor
    private func editingAreaVisible(_ field: XCUIElement, viewport: CGRect, multiline: Bool) -> Bool {
        let visible = field.frame.intersection(viewport)
        return field.isHittable && (multiline
            ? visible.width >= 44 && visible.height >= 44
            : contains(viewport, field.frame))
    }

    @MainActor
    private func assertKeyboardAccess(_ field: XCUIElement, action: XCUIElement, in scroll: XCUIElement,
                                      name: String, multiline: Bool = false) {
        let expectedValue = field.value as? String
        XCTAssertNotNil(expectedValue, "The typed input must expose its value")
        if pendingPasswordPromptFor != nil {
            resumePasswordInterruptedInput(field, expected: expectedValue ?? "",
                                           secure: field.elementType == .secureTextField)
        }
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(existsOrWait(keyboard, timeout: 10), "Software keyboard is required")
        for _ in 0..<4 {
            if pendingPasswordPromptFor != nil {
                resumePasswordInterruptedInput(field, expected: expectedValue ?? "",
                                               secure: field.elementType == .secureTextField)
            }
            XCTAssertTrue(keyboard.exists, "Scrolling dismissed the keyboard; this is not keyboard-clearance evidence")
            let viewport = visibleContent(in: scroll)
            if editingAreaVisible(field, viewport: viewport, multiline: multiline)
                && action.isHittable && contains(viewport, action.frame) { break }
            scrollContent(scroll, avoiding: field,
                          up: action.frame.maxY > viewport.maxY || field.frame.minY > viewport.maxY)
        }
        if multiline {
            // Prove editing still works after the bounded scroll. XCTest has no
            // public iOS caret rectangle; retain this typed state for screenshot
            // review rather than claiming a programmatic caret-bound assertion.
            waitForTypingKeyboard(refocusing: field, preserving: expectedValue ?? "")
            typeOnce("x", into: field, from: expectedValue ?? "", expecting: (expectedValue ?? "") + "x")
            typeOnce(XCUIKeyboardKey.delete.rawValue, into: field, from: (expectedValue ?? "") + "x", expecting: expectedValue ?? "")
        }
        XCTAssertTrue(keyboard.exists && keyboard.frame.height > 0, "The software keyboard must still be visible")
        XCTAssertFalse(keyboard.frame.intersection(app.frame).isEmpty,
                       "An offscreen keyboard accessibility element is not visible-keyboard evidence")
        if field.elementType == .secureTextField {
            XCTAssertEqual((field.value as? String)?.count, expectedValue?.count, "The masked input length changed during scrolling")
        } else {
            XCTAssertEqual(field.value as? String, expectedValue, "The typed value changed during scrolling")
        }
        if multiline {
            XCTAssertTrue(field.isEnabled)
            XCTAssertTrue(editingAreaVisible(field, viewport: visibleContent(in: scroll), multiline: true),
                          "The focused multiline editor needs at least 44pt of visible editing area above the keyboard")
        } else {
            assertControl(field, within: visibleContent(in: scroll))
        }
        assertControl(action, within: visibleContent(in: scroll))
        record(name, elements: [field, action, keyboard] + visibleKeyboardAccessories())
        attachEvidence(name)
    }

    @MainActor
    private func dismissKeyboard(in scroll: XCUIElement, avoiding field: XCUIElement) {
        // Interactive dismissal follows the touch offscreen. Unlike a content
        // reveal, this intentional pan must continue through the keyboard area.
        // It still starts in the owned app scroll view, outside the editor.
        for _ in 0..<3 {
            if !app.keyboards.firstMatch.exists { break }
            let viewport = visibleContent(in: scroll)
            let fieldFrame = field.frame
            let scrollFrame = scroll.frame
            let window = app.frame
            let left = max(0, min(viewport.maxX, fieldFrame.minX) - viewport.minX)
            let right = max(0, viewport.maxX - max(viewport.minX, fieldFrame.maxX))
            XCTAssertFalse(viewport.isEmpty, "Keyboard dismissal needs visible app content")
            XCTAssertGreaterThan(max(left, right), 0, "Keyboard dismissal must start outside the editor")
            let x = left >= right ? viewport.minX + left / 2 : viewport.maxX - right / 2
            let start = CGPoint(x: x, y: viewport.minY + viewport.height * 0.8)
            let end = CGPoint(x: x, y: window.maxY - 1)
            XCTAssertTrue(viewport.contains(start), "Keyboard dismissal must begin above the keyboard/accessory")
            XCTAssertTrue(window.contains(end), "Keyboard dismissal must end inside the observed window")
            XCTAssertGreaterThan(end.y, viewport.maxY, "Keyboard dismissal must continue beyond the obstruction's top")
            let origin = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
            let from = origin.withOffset(CGVector(dx: start.x - scrollFrame.minX, dy: start.y - scrollFrame.minY))
            let to = origin.withOffset(CGVector(dx: end.x - scrollFrame.minX, dy: end.y - scrollFrame.minY))
            checks.append(["name": "keyboard-dismiss-pan", "field": field.label,
                           "scroll": rectangle(scrollFrame), "viewport": rectangle(viewport), "window": rectangle(window),
                           "start": ["x": Double(start.x), "y": Double(start.y)],
                           "end": ["x": Double(end.x), "y": Double(end.y)]])
            from.press(forDuration: 0.1, thenDragTo: to)
        }
        wait("Software keyboard did not dismiss") { !self.app.keyboards.firstMatch.exists }
    }

    @MainActor
    private func record(_ name: String, elements: [XCUIElement]) {
        checks.append([
            "name": name,
            "window": rectangle(app.frame),
            "elements": elements.map { ["label": $0.label, "frame": rectangle($0.frame),
                                        "hittable": $0.isHittable, "typedValue": $0.value as? String ?? ""] as [String: Any] }
        ])
    }

    private func rectangle(_ frame: CGRect) -> [String: Double] {
        ["x": Double(frame.origin.x), "y": Double(frame.origin.y),
         "width": Double(frame.width), "height": Double(frame.height)]
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
