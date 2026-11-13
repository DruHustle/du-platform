import XCTest

final class DUNativeSmokeTests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app.launch()
        XCTAssertTrue(app.staticTexts["Explore what connects us"].waitForExistence(timeout: 65))
    }
    func open(_ path: String) { app.open(URL(string: "diasporaunlocked://" + path)!) }
    func reach(_ item: XCUIElement, backward: Bool = false, timeout: TimeInterval = 28) {
        let deadline = Date().addingTimeInterval(timeout)
        let scrollView = app.scrollViews.firstMatch
        let upper = scrollView.coordinate(withNormalizedOffset: CGVector(dx: 0.38, dy: 0.28))
        let lower = scrollView.coordinate(withNormalizedOffset: CGVector(dx: 0.38, dy: 0.60))
        while !item.isHittable && Date() < deadline {
            let above = item.exists && item.frame.midY < scrollView.frame.midY
            if above || backward { upper.press(forDuration: 0.1, thenDragTo: lower) }
            else { lower.press(forDuration: 0.1, thenDragTo: upper) }
        }
        XCTAssertTrue(item.isHittable, "Requested element did not become hittable: " + item.identifier)
    }
    func press(_ name: String, backward: Bool = false) {
        let action = app.buttons[name]
        reach(action, backward: backward)
        action.tap()
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
    func testExactFlight() {
        open("travel/flights")
        edit(app.textFields["From airport code (e.g. FRA)"], "LHR")
        edit(app.textFields["Departure date (YYYY-MM-DD)"], "2027-01-15")
        edit(app.textFields["Return date (YYYY-MM-DD)"], "2027-01-22")
        press("Edit travellers and currency")
        press("Add an adult")
        press("GBP")
        XCTAssertTrue(app.staticTexts["2 adults · GBP"].exists)
        press("Search providers")
        let check = app.buttons.matching(NSPredicate(format:"label == %@", "Check current provider details")).firstMatch
        reach(check, timeout: 60)
        check.tap()
        let direct = app.buttons["Continue to Kiwi.com"]
        reach(direct, timeout: 45)
        direct.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 25))
        XCTAssertTrue(safari.descendants(matching: .any).matching(NSPredicate(format:"label CONTAINS[c] %@ OR value CONTAINS[c] %@", "kiwi.com","kiwi.com")).firstMatch.waitForExistence(timeout:25))
    }
    func testResetLinkRecovery() {
        open("reset-password")
        press("Request a new reset link")
        XCTAssertTrue(app.buttons["Send reset instructions"].waitForExistence(timeout: 25))
        XCTAssertTrue(app.textFields["Email address"].exists)
    }
    func testBasket() {
        open("shop")
        press("Basket (0)")
        XCTAssertTrue(app.staticTexts["Your basket is empty."].waitForExistence(timeout: 25))
    }
    func testFilter() {
        open("shop/products?q=Mazoe%20Orange%202L")
        let product = app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@", "View details for ")).firstMatch
        XCTAssertTrue(product.waitForExistence(timeout:35))
        let stock = app.switches["Available to request only"]
        reach(stock)
        stock.tap()
        XCTAssertTrue(app.staticTexts["No products match. Change or clear your filters to see more."].waitForExistence(timeout: 25))
        reach(stock, backward:true)
        stock.tap()
        XCTAssertTrue(product.waitForExistence(timeout:35))
    }
    func testSharingChoice() {
        open("onesa-ai-chat")
        press("Keep my draft private")
        XCTAssertTrue(app.staticTexts["Sharing is off. Your draft stays here."].waitForExistence(timeout:15))
        press("Review chat sharing")
        press("Allow sharing for this chat")
        press("Revoke chat sharing")
        XCTAssertTrue(app.staticTexts["Sharing is off. Your draft stays here."].waitForExistence(timeout:15))
    }
}
