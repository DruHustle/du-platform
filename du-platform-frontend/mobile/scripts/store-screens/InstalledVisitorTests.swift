import XCTest

final class InstalledVisitorTests: XCTestCase {
    private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
        let deadline = Date().addingTimeInterval(25)
        while !element.isHittable && Date() < deadline {
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, "Expected form control was not reachable")
    }

    private func fill(_ field: XCUIElement, with value: String, in app: XCUIApplication) {
        reveal(field, in: app)
        field.tap()
        for character in value { field.typeText(String(character)) }
        XCTAssertEqual(field.value as? String, value)
    }

    func testAlertAndSupportReceipt() {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        app.open(URL(string: "diasporaunlocked://shop/product/qa-visitor-product")!)
        XCTAssertTrue(app.staticTexts["Installed QA product"].waitForExistence(timeout: 30))
        fill(app.textFields["Email address"], with: "visitor-alert@example.test", in: app)
        let alert = app.buttons["Email me when available"]
        reveal(alert, in: app)
        alert.tap()
        let inbox = app.staticTexts["If confirmation is needed, we’ll email you a link. Check your inbox and spam folder."]
        XCTAssertTrue(inbox.waitForExistence(timeout: 20))

        app.terminate()
        app.launch()
        XCTAssertTrue(app.staticTexts["Plan your next trip home"].waitForExistence(timeout: 45))
        let contact = app.buttons["Contact us"]
        reveal(contact, in: app)
        contact.tap()
        XCTAssertTrue(app.staticTexts["Contact and help"].waitForExistence(timeout: 20))
        fill(app.textFields["Full name"], with: "QA Visitor", in: app)
        fill(app.textFields["Email address"], with: "visitor-support@example.test", in: app)
        fill(app.textFields["Subject"], with: "Installed QA", in: app)
        fill(app.textViews["Message"], with: "Please confirm receipt of this test support message.", in: app)
        let done = app.buttons["Done editing"]
        XCTAssertTrue(done.waitForExistence(timeout: 10))
        done.tap()
        let submit = app.buttons["Send message"]
        reveal(submit, in: app)
        submit.tap()
        let prefix = "Your message was received. Reference: "
        let receipt = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
        XCTAssertTrue(receipt.waitForExistence(timeout: 20))
        let reference = String(receipt.label.dropFirst(prefix.count))
        XCTAssertNotNil(UUID(uuidString: reference))
        // Host verifier reads this XCTest attachment and compares it to the captured acknowledgement.
        let attachment = XCTAttachment(string: reference)
        attachment.name = "installed-support-id"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
