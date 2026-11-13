import XCTest

final class DUNativeSmokeTests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app.launch()
        XCTAssertTrue(app.staticTexts["Explore what connects us"].waitForExistence(timeout: 65))
    }
    func reach(_ item: XCUIElement, _ timeout: TimeInterval = 30) {
        let deadline = Date().addingTimeInterval(timeout)
        while !item.isHittable && Date() < deadline {
            let scroll = app.scrollViews.firstMatch
            let top = scroll.coordinate(withNormalizedOffset: CGVector(dx:0.45,dy:0.25))
            let bottom = scroll.coordinate(withNormalizedOffset: CGVector(dx:0.45,dy:0.57))
            if item.exists && item.frame.midY < app.frame.midY { top.press(forDuration:0.1,thenDragTo:bottom) }
            else { bottom.press(forDuration:0.1,thenDragTo:top) }
        }
        XCTAssertTrue(item.isHittable, item.description)
    }
    func press(_ label: String) {
        let button = app.buttons[label]
        reach(button)
        button.tap()
    }
    func enter(_ label: String, _ value: String, multiline: Bool = false) {
        let input = multiline ? app.textViews[label] : app.textFields[label]
        reach(input)
        input.tap()
        for character in value { input.typeText(String(character)) }
        XCTAssertEqual(input.value as? String, value)
        if !multiline { input.typeText("\n") }
    }
    func edit(_ item: XCUIElement, _ value: String) {
        reach(item)
        item.tap()
        item.typeKey("a", modifierFlags: .command)
        item.typeText(XCUIKeyboardKey.delete.rawValue)
        for c in value { item.typeText(String(c)) }
        XCTAssertEqual(item.value as? String, value)
        if app.keyboards.firstMatch.exists { item.typeText("\n") }
    }
    func testRejectedSignInCanRetry() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        app.open(URL(string: "diasporaunlocked://login")!)
        XCTAssertTrue(app.staticTexts["Welcome back"].waitForExistence(timeout: 30))
        let email = app.textFields["Email address"], password = app.secureTextFields["Password"]
        XCTAssertTrue(email.waitForExistence(timeout: 20)); email.tap()
        let address = "qa-\(UUID().uuidString.prefix(8).lowercased())@example.test"
        for character in address { email.typeText(String(character)) }
        XCTAssertEqual(email.value as? String, address, "Complete email must be present before submitting")
        password.tap()
        for character in "FixtureOnly123!" { password.typeText(String(character)) }
        let signIn = app.buttons["Sign in"]
        reach(signIn); signIn.tap()
        let rejection = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "Invalid email or password")).firstMatch
        XCTAssertTrue(rejection.waitForExistence(timeout: 20))
        XCTAssertEqual(email.value as? String, address)
        reach(signIn); signIn.tap()
        XCTAssertTrue(rejection.waitForExistence(timeout: 20))
    }

    func testExactFlight() {
        app.open(URL(string:"diasporaunlocked://travel/flights")!)
        edit(app.textFields["From airport code (e.g. FRA)"], "LHR")
        edit(app.textFields["Departure date (YYYY-MM-DD)"], "2027-01-15")
        edit(app.textFields["Return date (YYYY-MM-DD)"], "2027-01-22")
        press("Edit travellers and currency")
        press("Add an adult")
        press("GBP")
        XCTAssertTrue(app.staticTexts["2 adults · GBP"].exists)
        press("Search providers")
        let check = app.buttons.matching(NSPredicate(format:"label == %@", "Check current provider details")).firstMatch
        reach(check, 60)
        check.tap()
        let direct = app.buttons["Continue to Kiwi.com"]
        reach(direct, 45)
        direct.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 25))
        XCTAssertTrue(safari.descendants(matching: .any).matching(NSPredicate(format:"label CONTAINS[c] %@ OR value CONTAINS[c] %@", "kiwi.com","kiwi.com")).firstMatch.waitForExistence(timeout:25))
    }
    func testUncertainContactSurvivesRelaunchAndRetriesOnce() {
        press("Contact us")
        enter("Full name","Release fixture")
        enter("Email address","release-fixture@example.test")
        enter("Subject","Release recovery fixture")
        enter("Message","Isolated support recovery verification", multiline:true)
        XCTAssertTrue(app.keyboards.firstMatch.exists)
        let done=app.buttons["Done editing"]
        XCTAssertTrue(done.waitForExistence(timeout:12))
        XCTAssertTrue(done.isHittable,"Done editing must be visible while the keyboard is open")
        done.tap()
        let hidden=NSPredicate(format:"exists == false")
        let vanished=XCTNSPredicateExpectation(predicate:hidden,object:app.keyboards.firstMatch)
        XCTAssertEqual(XCTWaiter.wait(for:[vanished],timeout:8),.completed)
        XCTAssertEqual(app.textViews["Message"].value as? String,"Isolated support recovery verification")
        print("PASS Done editing dismissed the open keyboard without changing the visible iPhone draft")
        press("Send message")
        XCTAssertTrue(app.buttons["Retry same message"].waitForExistence(timeout:35))
        app.terminate()
        app.launch()
        press("Contact us")
        XCTAssertTrue(app.staticTexts["A previous message was not confirmed. Retry the same message."].waitForExistence(timeout:25))
        XCTAssertEqual(app.textFields["Email address"].value as? String,"release-fixture@example.test")
        XCTAssertEqual(app.textViews["Message"].value as? String,"Isolated support recovery verification")
        press("Retry same message")
        let reference=app.staticTexts.matching(NSPredicate(format:"label BEGINSWITH %@", "Your message was received. Reference: ")).firstMatch
        XCTAssertTrue(reference.waitForExistence(timeout:30))
        XCTAssertEqual(reference.label.replacingOccurrences(of:"Your message was received. Reference: ",with:"").count,36)
    }
    func testInvestmentOpensPublicBusinessDirectory() {
        press("Browse investment research")
        XCTAssertTrue(app.staticTexts["Investment"].waitForExistence(timeout:15))
        let direct=app.buttons["Search the business directory"]
        XCTAssertTrue(direct.waitForExistence(timeout:12))
        XCTAssertTrue(direct.isHittable,"Directory must be immediately reachable in the native screen")
        direct.tap()
        let web=app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout:45))
        let heading=web.descendants(matching:.any).matching(NSPredicate(format:"label CONTAINS[c] %@", "NTIR business directory")).firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout:50))
        print("PASS direct iPhone investment action displayed the public NTIR business directory")
    }
}
