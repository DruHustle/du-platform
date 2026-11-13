import XCTest

final class DUNativeSmokeTests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
    }

    private func scrollTo(_ element: XCUIElement, in app: XCUIApplication, timeout: TimeInterval = 24) {
        let deadline = Date().addingTimeInterval(timeout)
        while !element.isHittable && Date() < deadline {
            app.swipeUp()
            if element.waitForExistence(timeout: 1), element.isHittable { return }
        }
        XCTAssertTrue(element.isHittable, "Expected action did not become reachable")
    }

    private func openTravel(in app: XCUIApplication) {
        app.launch()
        XCTAssertTrue(app.staticTexts["Explore what connects us"].waitForExistence(timeout: 60))
        let flights = app.buttons["Find flights"]
        scrollTo(flights, in: app)
        flights.tap()
        XCTAssertTrue(app.buttons["Stays"].waitForExistence(timeout: 20))
    }

    func testOpenTravelFromHome() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        XCTAssertTrue(app.staticTexts["Explore what connects us"].waitForExistence(timeout: 60))
        attach("Home")
        let flights = app.buttons["Find flights"]
        scrollTo(flights, in: app)
        flights.tap()
        XCTAssertTrue(app.buttons["Stays"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.staticTexts["Enter a city name or a three-letter airport code."].waitForExistence(timeout: 10))
        attach("Travel")
    }

    func testDirectFlightHandoff() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        openTravel(in: app)
        let search = app.buttons["Search providers"]
        scrollTo(search, in: app)
        search.tap()
        let check = app.buttons.matching(NSPredicate(format: "label == %@", "Check current provider details")).firstMatch
        scrollTo(check, in: app, timeout: 45)
        check.tap()
        let direct = app.buttons["Continue to Kiwi.com"]
        scrollTo(direct, in: app, timeout: 45)
        direct.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20), "Direct action did not foreground Safari")
        let url = safari.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS[c] %@ OR value CONTAINS[c] %@", "kiwi.com", "kiwi.com")).firstMatch
        XCTAssertTrue(url.waitForExistence(timeout: 25), "Safari did not expose the Kiwi destination")
    }

    func testRejectedSignInCanRetry() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        let account = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Account")).firstMatch
        XCTAssertTrue(account.waitForExistence(timeout: 60)); account.tap()
        let email = app.textFields["Email address"], password = app.secureTextFields["Password"]
        XCTAssertTrue(email.waitForExistence(timeout: 20)); email.tap()
        let address = "qa-\(UUID().uuidString.prefix(8).lowercased())@example.test"
        email.typeText(address); password.tap(); password.typeText("FixtureOnly123!")
        let signIn = app.buttons["Sign in"]
        scrollTo(signIn, in: app); signIn.tap()
        let rejection = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "Invalid email or password")).firstMatch
        XCTAssertTrue(rejection.waitForExistence(timeout: 20))
        XCTAssertEqual(email.value as? String, address)
        scrollTo(signIn, in: app); signIn.tap()
        XCTAssertTrue(rejection.waitForExistence(timeout: 20))
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "DU-" + name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
