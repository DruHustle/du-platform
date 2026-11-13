import XCTest

final class DUNativeSmokeTests: XCTestCase {
    func testOpenTravelFromHome() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        let flights = app.buttons["Find flights"]
        XCTAssertTrue(flights.waitForExistence(timeout: 60))
        attach("Home")
        if !flights.isHittable { app.swipeUp() }
        XCTAssertTrue(flights.isHittable)
        flights.tap()
        XCTAssertTrue(app.buttons["Stays"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.staticTexts["Enter a city name or a three-letter airport code."].waitForExistence(timeout: 10))
        attach("Travel")
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "DU-" + name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
