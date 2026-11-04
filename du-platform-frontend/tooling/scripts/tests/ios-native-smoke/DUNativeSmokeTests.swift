import XCTest
import UIKit

/// Exercises the actual app through accessibility. No taps use guessed points,
/// no network responses are substituted, and no account/message is submitted.
final class DUNativeSmokeTests: XCTestCase {
    @MainActor private var app: XCUIApplication!
    private var checks: [[String: Any]] = []
    private let tabs = ["Home", "Shop", "Travel", "Assistant", "Account"]
    @MainActor private static var dismissedTypingTutorial = false
    private var pendingPasswordPromptFor: String?
    private var lastKeyboardDiagnostic: [String: Any] = [:]

    private struct KeyboardObservation {
        let window: CGRect
        let hasKeyboardElement: Bool
        let keyboard: CGRect?
        let accessories: [CGRect]
        let obstruction: CGRect?
    }

    private struct KeyboardHierarchy {
        let window: CGRect
        let descendantWindows: [CGRect]
        let keyboards: [CGRect]
        let accessories: [CGRect]
    }

    private struct KeyboardTargetFailure: Error {
        let kind: String
        let detail: String
    }

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
    func testPortraitNavigationAndKeyboard() {
        exerciseOrientation(.portrait, name: "portrait")
    }

    @MainActor
    func testLandscapeNavigationAndKeyboard() {
        exerciseOrientation(.landscapeLeft, name: "landscape")
    }

    @MainActor
    private func exerciseOrientation(_ orientation: UIDeviceOrientation, name: String) {
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
        replaceFixture(email, with: "ios-smoke@example.invalid")
        XCTAssertEqual(email.value as? String, "ios-smoke@example.invalid")
        let password = unique(.secureTextField, "Password")
        reveal(password, in: accountScroll)
        replaceFixture(password, with: "keyboard-fixture", secure: true)
        XCTAssertFalse((password.value as? String ?? "").isEmpty)
        XCTAssertNotEqual(password.value as? String, "Password")
        XCTAssertEqual((password.value as? String)?.count, "keyboard-fixture".count)
        assertKeyboardAccess(password, action: unique(.button, "Sign in"), in: accountScroll,
                             name: "\(name)-account-keyboard")
        // One prompt allowance follows this verified Account visit. Rotation
        // checks remain in the mounted form and do not create another visit.
        pendingPasswordPromptFor = name
        dismissKeyboard(in: accountScroll, avoiding: password)
        _ = declinePasswordPrompt(preserving: password, expected: "keyboard-fixture", secure: true)
        assertRetainedInput([(email, "ios-smoke@example.invalid", false), (password, "keyboard-fixture", true)],
                            orientation: orientation, name: "\(name)-account", promptField: password,
                            promptValue: "keyboard-fixture", secure: true)
        // The delayed native prompt may appear during the rotation checks.
        _ = declinePasswordPrompt(preserving: password, expected: "keyboard-fixture", secure: true)

        navigate("Assistant", text: "Onesa assistant")
        let message = unique(.textView, "Your message")
        let assistantScroll = contentScrollView(containing: message)
        reveal(message, in: assistantScroll)
        replaceFixture(message, with: "A simulator keyboard check.")
        XCTAssertEqual(message.value as? String, "A simulator keyboard check.")
        assertKeyboardAccess(message, action: unique(.button, "Send message"), in: assistantScroll,
                             name: "\(name)-assistant-keyboard", multiline: true)
        dismissKeyboard(in: assistantScroll, avoiding: message)
        assertRetainedInput([(message, "A simulator keyboard check.", false)],
                            orientation: orientation, name: "\(name)-assistant", promptField: message,
                            promptValue: "A simulator keyboard check.")
        checkTabs("\(name)-tabs-after-keyboard")
        attachEvidence(name)
        pendingPasswordPromptFor = nil
        rotate(.portrait, name: "restored-portrait")
        navigate("Home", text: "Explore what connects us")
        checkTabs("restored-portrait-tabs")
    }

    @MainActor
    private func assertRetainedInput(_ fields: [(XCUIElement, String, Bool)], orientation: UIDeviceOrientation,
                                     name: String, promptField: XCUIElement, promptValue: String, secure: Bool = false) {
        let other: UIDeviceOrientation = orientation.isLandscape ? .portrait : .landscapeLeft
        for (phase, target) in [("away", other), ("back", orientation)] {
            rotate(target, name: "\(name)-rotate-\(phase)")
            _ = declinePasswordPrompt(preserving: promptField, expected: promptValue, secure: secure)
            for (field, expected, masked) in fields {
                XCTAssertTrue(inputMatches(field, expected: expected, secure: masked),
                              "Rotation must preserve the exact input or masked length: \(field.label)")
            }
            record("\(name)-retained-\(phase)", elements: fields.map { $0.0 })
        }
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
    private func captureKeyboardHierarchy() throws -> KeyboardHierarchy {
        let snapshot = try app.snapshot()
        var descendants = snapshot.children
        var index = 0
        var windows: [CGRect] = []
        var keyboards: [CGRect] = []
        var accessories: [CGRect] = []
        while index < descendants.count {
            let element = descendants[index]
            index += 1
            descendants.append(contentsOf: element.children)
            if element.elementType == .window {
                windows.append(element.frame)
            } else if element.elementType == .keyboard {
                keyboards.append(element.frame)
            } else if element.elementType == .other && element.identifier == "SystemInputAssistantView" {
                accessories.append(element.frame)
            }
        }
        // Descendant frames are retained for diagnosis only. In the observed
        // rotated hierarchy they differed from resolved element coordinates.
        return KeyboardHierarchy(window: snapshot.frame, descendantWindows: windows,
                                 keyboards: keyboards, accessories: accessories)
    }

    private func hierarchyRecord(_ hierarchy: KeyboardHierarchy) -> [String: Any] {
        ["window": rectangle(hierarchy.window), "descendantWindows": hierarchy.descendantWindows.map(rectangle),
         "keyboards": hierarchy.keyboards.map(rectangle),
         "accessories": hierarchy.accessories.map(rectangle)]
    }

    private func hierarchyWindowMatches(_ hierarchy: KeyboardHierarchy, window: CGRect) -> Bool {
        finite(hierarchy.window) && !hierarchy.window.isEmpty && hierarchy.window == window
    }

    @MainActor
    private func resolvedFrames(_ elements: [XCUIElement], kind: String) throws -> [CGRect] {
        do {
            return try elements.map { try $0.snapshot().frame }
        } catch {
            throw KeyboardTargetFailure(kind: kind, detail: String(describing: error))
        }
    }

    @MainActor
    private func confirmedAbsence(_ kind: String, orientation: UIDeviceOrientation, window: CGRect,
                                  diagnostic: inout [String: Any]) throws -> Bool {
        let first = try captureKeyboardHierarchy()
        let second = try captureKeyboardHierarchy()
        let currentWindow = app.frame
        diagnostic["absenceFirst"] = hierarchyRecord(first)
        diagnostic["absenceSecond"] = hierarchyRecord(second)
        diagnostic["absenceWindow"] = rectangle(currentWindow)
        diagnostic["absenceOrientation"] = XCUIDevice.shared.orientation.rawValue
        let empty = kind == "keyboard"
            ? first.keyboards.isEmpty && second.keyboards.isEmpty
            : first.accessories.isEmpty && second.accessories.isEmpty
        return empty && hierarchyWindowMatches(first, window: window)
            && hierarchyWindowMatches(second, window: window) && currentWindow == window
            && XCUIDevice.shared.orientation == orientation
    }

    @MainActor
    private func rejectKeyboardObservation(_ reason: String, diagnostic: [String: Any]) {
        lastKeyboardDiagnostic = diagnostic
        checks.append(["name": "keyboard-observation-rejected", "reason": reason, "observation": diagnostic])
        XCTFail(reason)
    }

    @MainActor
    private func observeKeyboard(includeAccessories: Bool = true) -> KeyboardObservation? {
        // At most two read attempts may establish one consistent observation.
        // No UI action or text event is repeated by this measurement helper.
        for attempt in 0..<2 {
            let orientation = XCUIDevice.shared.orientation
            let window = app.frame
            var diagnostic: [String: Any] = ["attempt": attempt + 1, "orientation": orientation.rawValue,
                                            "window": rectangle(window), "includeAccessories": includeAccessories]
            do {
                guard finite(window) && !window.isEmpty && (orientation.isPortrait || orientation.isLandscape) else {
                    rejectKeyboardObservation("The application must have a finite window and a stable orientation", diagnostic: diagnostic)
                    return nil
                }
                let rawBefore: KeyboardHierarchy?
                if includeAccessories { rawBefore = try captureKeyboardHierarchy() }
                else { rawBefore = nil }
                if let raw = rawBefore { diagnostic["rawBefore"] = hierarchyRecord(raw) }
                let keyboardTargets = app.keyboards.allElementsBoundByIndex
                if keyboardTargets.isEmpty {
                    if try confirmedAbsence("keyboard", orientation: orientation, window: window, diagnostic: &diagnostic) {
                        lastKeyboardDiagnostic = diagnostic
                        return KeyboardObservation(window: window, hasKeyboardElement: false,
                                                   keyboard: nil, accessories: [], obstruction: nil)
                    }
                    checks.append(["name": "keyboard-observation-changed", "observation": diagnostic])
                    if attempt == 0 { continue }
                    rejectKeyboardObservation("Keyboard absence was not confirmed by a stable readable hierarchy", diagnostic: diagnostic)
                    return nil
                }
                let keyboardFrames = try resolvedFrames(keyboardTargets, kind: "keyboard")
                diagnostic["resolvedKeyboards"] = keyboardFrames.map(rectangle)
                var accessoryFrames: [CGRect] = []
                var keyboardFramesAfter = keyboardFrames
                var rawAfter: KeyboardHierarchy?
                if includeAccessories {
                    let targets = app.otherElements.matching(NSPredicate(format: "identifier == %@", "SystemInputAssistantView"))
                        .allElementsBoundByIndex
                    accessoryFrames = try resolvedFrames(targets, kind: "accessory")
                    diagnostic["resolvedAccessories"] = accessoryFrames.map(rectangle)
                    // Ensure the keyboard did not move while its accessory was
                    // captured. Raw app snapshots establish presence, not coordinates.
                    keyboardFramesAfter = try resolvedFrames(app.keyboards.allElementsBoundByIndex, kind: "keyboard")
                    let after = try captureKeyboardHierarchy()
                    rawAfter = after
                    diagnostic["resolvedKeyboardsAfter"] = keyboardFramesAfter.map(rectangle)
                    diagnostic["rawAfter"] = hierarchyRecord(after)
                }
                let currentWindow = app.frame
                diagnostic["windowAfter"] = rectangle(currentWindow)
                diagnostic["orientationAfter"] = XCUIDevice.shared.orientation.rawValue
                let presenceAgrees = rawBefore.map { hierarchyWindowMatches($0, window: window)
                    && $0.keyboards.count == keyboardFrames.count
                    && $0.accessories.count == accessoryFrames.count } ?? true
                let finalPresenceAgrees = rawAfter.map { hierarchyWindowMatches($0, window: window)
                    && $0.keyboards.count == keyboardFrames.count
                    && $0.accessories.count == accessoryFrames.count } ?? true
                guard currentWindow == window && XCUIDevice.shared.orientation == orientation
                    && keyboardFrames == keyboardFramesAfter && presenceAgrees && finalPresenceAgrees else {
                    checks.append(["name": "keyboard-observation-changed", "observation": diagnostic])
                    if attempt == 0 { continue }
                    rejectKeyboardObservation("Keyboard geometry or orientation changed during its bounded observation", diagnostic: diagnostic)
                    return nil
                }
                let frames = keyboardFrames + accessoryFrames
                guard frames.allSatisfy({ finite($0) && $0.width >= 0 && $0.height >= 0
                    && ($0.intersection(window).isEmpty || contains(window, $0)) }) else {
                    if rawBefore == nil {
                        do { diagnostic["rawAtRejection"] = hierarchyRecord(try captureKeyboardHierarchy()) }
                        catch { diagnostic["rawCaptureError"] = String(describing: error) }
                    }
                    rejectKeyboardObservation("Resolved keyboard geometry must be finite and use the observed screen window", diagnostic: diagnostic)
                    return nil
                }
                var keyboard: CGRect?
                for frame in keyboardFrames where !frame.intersection(window).isEmpty && frame.height > 0 {
                    keyboard = keyboard.map { $0.union(frame) } ?? frame
                }
                let accessories = accessoryFrames.filter { !$0.intersection(window).isEmpty }
                let obstruction = keyboard.map { frame in
                    accessories.reduce(frame) { $0.union($1) }.intersection(window)
                }
                lastKeyboardDiagnostic = diagnostic
                return KeyboardObservation(window: window, hasKeyboardElement: true, keyboard: keyboard,
                                           accessories: accessories, obstruction: obstruction)
            } catch let failure as KeyboardTargetFailure {
                diagnostic["targetFailure"] = ["kind": failure.kind, "detail": failure.detail]
                do {
                    if try confirmedAbsence(failure.kind, orientation: orientation, window: window, diagnostic: &diagnostic) {
                        checks.append(["name": "keyboard-target-disappeared", "observation": diagnostic])
                        if failure.kind == "keyboard" {
                            lastKeyboardDiagnostic = diagnostic
                            return KeyboardObservation(window: window, hasKeyboardElement: false,
                                                       keyboard: nil, accessories: [], obstruction: nil)
                        }
                        if attempt == 0 { continue }
                    }
                } catch { diagnostic["absenceCaptureError"] = String(describing: error) }
                rejectKeyboardObservation("A disappearing keyboard target could not be read or confirmed absent", diagnostic: diagnostic)
                return nil
            } catch {
                diagnostic["hierarchyError"] = String(describing: error)
                rejectKeyboardObservation("Could not capture the application keyboard hierarchy", diagnostic: diagnostic)
                return nil
            }
        }
        return nil
    }

    @MainActor
    private func visibleContent(in scroll: XCUIElement) -> CGRect {
        guard let observation = observeKeyboard() else { return .null }
        return visibleContent(in: scroll, observing: observation)
    }

    @MainActor
    private func visibleContent(in scroll: XCUIElement, observing observation: KeyboardObservation) -> CGRect {
        var frame = scroll.frame.intersection(observation.window)
        if let keyboard = observation.obstruction {
            frame.size.height = max(0, min(frame.maxY, keyboard.minY) - frame.minY)
        }
        return frame
    }

    private func contains(_ outer: CGRect, _ inner: CGRect) -> Bool {
        !outer.isEmpty && !inner.isEmpty && outer.insetBy(dx: -0.5, dy: -0.5).contains(inner)
    }

    private func finite(_ frame: CGRect) -> Bool {
        [frame.minX, frame.minY, frame.width, frame.height].allSatisfy { $0.isFinite }
    }

    @MainActor
    private func recordGeometry(_ name: String, frames: [String: CGRect]) {
        checks.append(["name": name, "frames": frames.mapValues(rectangle),
                       "keyboardObservation": lastKeyboardDiagnostic])
    }

    @MainActor
    private func assertControl(_ element: XCUIElement, within viewport: CGRect) {
        let enabled = element.isEnabled
        let hittable = element.isHittable
        let frame = element.frame
        recordGeometry("control-geometry-\(element.label)", frames: ["control": frame, "viewport": viewport])
        XCTAssertTrue(enabled, "Disabled control: \(element.label)")
        XCTAssertTrue(hittable, "Unreachable control: \(element.label)")
        XCTAssertGreaterThanOrEqual(frame.width, 44, "Narrow touch target: \(element.label)")
        XCTAssertGreaterThanOrEqual(frame.height, 44, "Short touch target: \(element.label)")
        XCTAssertTrue(contains(viewport, frame), "Clipped control \(element.label): \(frame), viewport \(viewport)")
    }

    @MainActor
    private func scrollContent(_ scroll: XCUIElement, avoiding field: XCUIElement, up: Bool) {
        let viewport = visibleContent(in: scroll)
        let fieldFrame = field.frame
        let scrollFrame = scroll.frame
        recordGeometry("content-scroll-geometry", frames: ["scroll": scrollFrame, "viewport": viewport, "field": fieldFrame])
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
        observeKeyboard(includeAccessories: false)?.keyboard
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
    @discardableResult
    private func resumePasswordInterruptedInput(_ field: XCUIElement, expected: String, secure: Bool = false) -> Bool {
        guard declinePasswordPrompt(preserving: field, expected: expected, secure: secure) else { return false }
        // Only the observed prompt authorizes refocusing; this never types,
        // repairs a value, or retries an event already sent to the input.
        field.tap()
        waitForTypingKeyboard(refocusing: field, preserving: expected, secure: secure)
        XCTAssertTrue(inputMatches(field, expected: expected, secure: secure),
                      "Refocusing after the password prompt must preserve the acknowledged input")
        return true
    }

    @MainActor
    private func awaitExpectedPasswordTransition(_ field: XCUIElement, expected: String, secure: Bool = false) {
        guard pendingPasswordPromptFor != nil else {
            XCTFail("The software keyboard disappeared without an authorized password-prompt phase")
            return
        }
        // The exact input must already be acknowledged. iOS can remove the
        // keyboard before the anticipated password prompt becomes observable.
        wait("The keyboard disappeared without the anticipated password prompt", timeout: 10) {
            self.passwordPrompt() != nil
        }
        XCTAssertTrue(resumePasswordInterruptedInput(field, expected: expected, secure: secure),
                      "The exact anticipated password prompt must be acknowledged before resuming")
        XCTAssertNotNil(visibleKeyboardFrame(), "The real software keyboard must return before further input")
    }

    @MainActor
    private func dismissKnownTypingTutorial() -> Bool {
        let tutorials = typingTutorials()
        guard tutorials.firstMatch.exists else { return false }
        XCTAssertEqual(tutorials.count, 1, "The observed iOS keyboard tutorial must be unique")
        XCTAssertFalse(Self.dismissedTypingTutorial, "The first-use keyboard tutorial must not recur on this device")
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
        Self.dismissedTypingTutorial = true
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
            guard let frame = self.observeKeyboard()?.obstruction else {
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
        if keyboardFrame == nil {
            awaitExpectedPasswordTransition(field, expected: previous, secure: secure)
            keyboardFrame = visibleKeyboardFrame()
        }
        XCTAssertNotNil(keyboardFrame, "The software keyboard disappeared before typing")
        field.typeText(character)
        // Acknowledgment observes each event; it never resends it or repairs the
        // text. Secure inputs expose only a masked value, so check its length.
        wait("Typed input did not acknowledge the expected \(secure ? "masked length" : "exact prefix") of \(value.count)", timeout: 3) {
            return self.inputMatches(field, expected: value, secure: secure)
        }
        if visibleKeyboardFrame() == nil {
            // The event was sent exactly once and its NEW value is confirmed.
            // Observing the known OS transition does not extend that deadline.
            awaitExpectedPasswordTransition(field, expected: value, secure: secure)
        }
        XCTAssertTrue(inputMatches(field, expected: value, secure: secure))
    }

    @MainActor
    private func replaceFixture(_ field: XCUIElement, with value: String, secure: Bool = false) {
        // Exercise a real nonempty -> empty -> full replacement in each case,
        // independently of the other test's application state or execution order.
        replaceText(field, with: "xy", secure: secure)
        replaceText(field, with: value, secure: secure)
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
        wait("Software keyboard is required") { self.visibleKeyboardFrame() != nil }
        for _ in 0..<4 {
            if pendingPasswordPromptFor != nil {
                resumePasswordInterruptedInput(field, expected: expectedValue ?? "",
                                               secure: field.elementType == .secureTextField)
            }
            guard let observation = observeKeyboard() else { return }
            recordGeometry("keyboard-clearance-observation", frames: ["window": observation.window, "scroll": scroll.frame])
            XCTAssertNotNil(observation.keyboard, "Scrolling dismissed the keyboard; this is not keyboard-clearance evidence")
            let viewport = visibleContent(in: scroll, observing: observation)
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
        guard let observation = observeKeyboard() else { return }
        recordGeometry("keyboard-clearance-final", frames: ["window": observation.window, "scroll": scroll.frame,
                                                             "field": field.frame, "action": action.frame])
        XCTAssertNotNil(observation.keyboard,
                        "The software keyboard must have a nonempty visible frame inside the application window")
        let viewport = visibleContent(in: scroll, observing: observation)
        if field.elementType == .secureTextField {
            XCTAssertEqual((field.value as? String)?.count, expectedValue?.count, "The masked input length changed during scrolling")
        } else {
            XCTAssertEqual(field.value as? String, expectedValue, "The typed value changed during scrolling")
        }
        if multiline {
            XCTAssertTrue(field.isEnabled)
            XCTAssertTrue(editingAreaVisible(field, viewport: viewport, multiline: true),
                          "The focused multiline editor needs at least 44pt of visible editing area above the keyboard")
        } else {
            assertControl(field, within: viewport)
        }
        assertControl(action, within: viewport)
        record(name, elements: [field, action], keyboard: observation)
        attachEvidence(name)
    }

    @MainActor
    private func dismissKeyboard(in scroll: XCUIElement, avoiding field: XCUIElement) {
        // Interactive dismissal follows the touch offscreen. Unlike a content
        // reveal, this intentional pan must continue through the keyboard area.
        // It still starts in the owned app scroll view, outside the editor.
        for _ in 0..<3 {
            guard let observation = observeKeyboard() else { return }
            if !observation.hasKeyboardElement { break }
            let viewport = visibleContent(in: scroll, observing: observation)
            let fieldFrame = field.frame
            let scrollFrame = scroll.frame
            let window = observation.window
            recordGeometry("keyboard-dismiss-geometry", frames: ["window": window, "scroll": scrollFrame,
                                                                  "viewport": viewport, "field": fieldFrame])
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
        wait("Software keyboard did not dismiss") {
            guard let observation = self.observeKeyboard() else { return false }
            return !observation.hasKeyboardElement
        }
    }

    @MainActor
    private func record(_ name: String, elements: [XCUIElement], keyboard: KeyboardObservation? = nil) {
        var check: [String: Any] = [
            "name": name,
            "window": rectangle(keyboard?.window ?? app.frame),
            "elements": elements.map { ["label": $0.label, "frame": rectangle($0.frame),
                                        "hittable": $0.isHittable, "typedValue": $0.value as? String ?? ""] as [String: Any] }
        ]
        if let observation = keyboard {
            check["keyboardObservation"] = [
                "source": "validated-resolved-element-snapshots",
                "hasKeyboardElement": observation.hasKeyboardElement,
                "frame": observation.keyboard.map { rectangle($0) as Any } ?? NSNull(),
                "accessories": observation.accessories.map(rectangle),
                "obstruction": observation.obstruction.map { rectangle($0) as Any } ?? NSNull()
            ] as [String: Any]
        }
        checks.append(check)
    }

    private func rectangle(_ frame: CGRect) -> [String: Any] {
        guard finite(frame) else { return ["invalid": true, "description": String(describing: frame)] }
        return ["x": Double(frame.origin.x), "y": Double(frame.origin.y),
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
