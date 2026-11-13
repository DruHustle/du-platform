import XCTest

final class DUNativeSmokeTests: XCTestCase {
    private func reach(_ item: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<8 {
            if item.isHittable { return }
            app.swipeUp()
        }
        XCTAssertTrue(item.isHittable)
    }

    private func enter(_ value: String, in field: XCUIElement) {
        XCTAssertTrue(field.waitForExistence(timeout: 20))
        field.tap()
        for character in value { field.typeText(String(character)) }
    }

    func testOneAccountCycle() throws {
        continueAfterFailure = false
        guard let email = ProcessInfo.processInfo.environment["DU_QA_EMAIL"],
              let password = ProcessInfo.processInfo.environment["DU_QA_PASSWORD"],
              email == "qa-native-20261113-ios@example.test" else {
            XCTFail("The fixed QA test identity was not passed to the runner")
            return
        }
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        XCTAssertTrue(app.staticTexts["Explore what connects us"].waitForExistence(timeout: 60))
        app.open(URL(string: "diasporaunlocked://login")!)
        XCTAssertTrue(app.staticTexts["Welcome back"].waitForExistence(timeout: 30))
        print("DU_STAGE account-form")
        let address = app.textFields["Email address"]
        enter(email, in: address)
        XCTAssertEqual(address.value as? String, email)
        print("DU_STAGE email-entered")
        let secret = app.secureTextFields["Password"]
        let identity = app.staticTexts["Signed in as " + email]
        let signIn = app.buttons["Sign in"]
        for step in ["first-sign-in", "second-sign-in"] {
            enter(password, in: secret)
            reach(signIn, in: app)
            signIn.tap()
            XCTAssertTrue(identity.waitForExistence(timeout: 30))
            print("DU_STAGE " + step)
            if step == "first-sign-in" {
                let signOut = app.buttons["Sign out"]
                reach(signOut, in: app)
                signOut.tap()
                XCTAssertTrue(app.staticTexts["Welcome back"].waitForExistence(timeout: 25))
                if address.value as? String != email {
                    enter(email, in: address)
                }
                XCTAssertEqual(address.value as? String, email)
                print("DU_STAGE signed-out")
            }
        }
        let action = app.buttons["Request account deletion"]
        reach(action, in: app)
        action.tap()
        let current = app.secureTextFields["Current password"]
        reach(current, in: app)
        enter(password, in: current)
        let confirm = app.buttons["Confirm deletion request"]
        reach(confirm, in: app)
        confirm.tap()
        let receipt = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Deletion request received. Reference:")).firstMatch
        XCTAssertTrue(receipt.waitForExistence(timeout: 30))
        print("DU_STAGE deletion-receipt")
    }
}
