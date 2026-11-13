import XCTest

final class DUNativeSmokeTests: XCTestCase {
    private func tapVisible(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<10 {
            if element.isHittable { element.tap(); return }
            app.swipeUp()
        }
        XCTFail("The expected account control was unreachable")
    }

    func testOneAccountCycle() throws {
        continueAfterFailure = false
        guard let address = ProcessInfo.processInfo.environment["DU_QA_EMAIL"],
              let password = ProcessInfo.processInfo.environment["DU_QA_PASSWORD"],
              address == "qa-native-20261113-ios@example.test" else {
            throw XCTSkip("This test requires activation for the release qualification account")
        }
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        let tab = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Account")).firstMatch
        XCTAssertTrue(tab.waitForExistence(timeout: 60)); tab.tap()
        let create = app.buttons["Create an account"]
        tapVisible(create, in: app)
        let name = app.textFields["Full name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10)); name.tap(); name.typeText("Diaspora iOS QA")
        let email = app.textFields["Email address"]
        email.tap(); email.typeText(address)
        let secret = app.secureTextFields["Password"]
        secret.tap(); secret.typeText(password)
        tapVisible(app.buttons["Create account"], in: app)
        let identity = app.staticTexts["Signed in as " + address]
        XCTAssertTrue(identity.waitForExistence(timeout: 30))
        tapVisible(app.buttons["Sign out"], in: app)
        XCTAssertTrue(email.waitForExistence(timeout: 30))
        if email.value as? String != address { email.tap(); email.typeText(address) }
        secret.tap(); secret.typeText(password)
        tapVisible(app.buttons["Sign in"], in: app)
        XCTAssertTrue(identity.waitForExistence(timeout: 30))
        tapVisible(app.buttons["Request account deletion"], in: app)
        let current = app.secureTextFields["Current password"]
        tapVisible(current, in: app); current.typeText(password)
        tapVisible(app.buttons["Confirm deletion request"], in: app)
        let receipt = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Deletion request received. Reference:")).firstMatch
        XCTAssertTrue(receipt.waitForExistence(timeout: 30))
    }
}
