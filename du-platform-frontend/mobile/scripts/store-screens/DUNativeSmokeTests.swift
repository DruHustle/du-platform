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
            let scroll = app.scrollViews.firstMatch
            let surface = scroll.exists ? scroll : app
            if element.exists && element.frame.maxY < app.frame.midY {
                surface.swipeDown(velocity: .slow)
            } else {
                surface.swipeUp(velocity: .slow)
            }
            if element.waitForExistence(timeout: 1), element.isHittable { return }
        }
        XCTAssertTrue(element.isHittable, "Expected action did not become reachable: \(element.debugDescription)")
    }

    private func finishEntry(_ value: String, in field: XCUIElement, app: XCUIApplication) {
        scrollTo(field, in: app)
        field.tap()
        for character in value { field.typeText(String(character)) }
        XCTAssertEqual(field.value as? String, value)
        let done = app.buttons.matching(NSPredicate(format: "label ==[c] %@", "done")).firstMatch
        if done.waitForExistence(timeout: 2), done.isHittable {
            done.tap()
        } else {
            field.typeText("\n")
        }
    }

    private func openTravel(in app: XCUIApplication) {
        app.launch()
        XCTAssertTrue(app.staticTexts["Plan your next trip home"].waitForExistence(timeout: 60))
        let flights = app.buttons["Search flights"]
        scrollTo(flights, in: app)
        flights.tap()
        XCTAssertTrue(app.buttons["Stays"].waitForExistence(timeout: 20))
    }

    func testOpenTravelFromHome() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        XCTAssertTrue(app.staticTexts["Plan your next trip home"].waitForExistence(timeout: 60))
        attach("Home")
        let flights = app.buttons["Search flights"]
        scrollTo(flights, in: app)
        flights.tap()
        XCTAssertTrue(app.buttons["Stays"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.staticTexts["Choose your departure and destination airports."].waitForExistence(timeout: 10))
        attach("Travel")
    }

    func testOpenProductFromHome() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        let browse = app.buttons["Browse Zimbabwean products"]
        XCTAssertTrue(app.staticTexts["Plan your next trip home"].waitForExistence(timeout: 60))
        scrollTo(browse, in: app); browse.tap()
        XCTAssertTrue(app.textFields["Search products"].waitForExistence(timeout: 20))
        let product = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "View details for ")).firstMatch
        XCTAssertTrue(product.waitForExistence(timeout: 30), "Catalogue did not return a product")
        scrollTo(product, in: app)
        let name = String(product.label.dropFirst("View details for ".count))
        product.tap()
        XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout: 30))
        let price = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Indicative price:")).firstMatch
        XCTAssertTrue(price.waitForExistence(timeout: 20))
        attach("Product")
    }

    func testDirectFlightHandoff() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        openTravel(in: app)
        let search = app.buttons["Search Kiwi.com"]
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

    func testMissingResetLinkOpensRecoveryForm() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        app.open(URL(string: "diasporaunlocked://reset-password?next=%2Ftravel%2Fstays")!)
        let request = app.buttons["Request a new reset link"]
        XCTAssertTrue(request.waitForExistence(timeout: 30))
        request.tap()
        XCTAssertTrue(app.buttons["Send reset instructions"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.textFields["Email address"].exists)
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
        scrollTo(signIn, in: app); signIn.tap()
        let rejection = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "Invalid email or password")).firstMatch
        XCTAssertTrue(rejection.waitForExistence(timeout: 20))
        XCTAssertEqual(email.value as? String, address)
        scrollTo(signIn, in: app); signIn.tap()
        XCTAssertTrue(rejection.waitForExistence(timeout: 20))
    }

    func testCareLookupForFamilyInZimbabwe() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        let care = app.buttons["Find funeral cover providers"]
        XCTAssertTrue(app.staticTexts["Plan your next trip home"].waitForExistence(timeout: 60))
        scrollTo(care, in: app); care.tap()
        let funeral = app.buttons["How can I cover funeral costs for a relative in Zimbabwe?"]
        XCTAssertTrue(funeral.waitForExistence(timeout: 20)); funeral.tap()
        for (label, code, country) in [("Where do you live?", "DE", "Germany"), ("Where does the person you want to cover live?", "ZW", "Zimbabwe")] {
            let field = app.textFields[label]
            finishEntry(code, in: field, app: app)
            let chooseCountry = app.buttons[country]
            scrollTo(chooseCountry, in: app); chooseCountry.tap()
        }
        let provider = app.buttons["Read the cash funeral plan at ZB"]
        scrollTo(provider, in: app)
        XCTAssertTrue(provider.isEnabled)
    }

    func testSearchForFamilyStay() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        XCTAssertTrue(app.staticTexts["Plan your next trip home"].waitForExistence(timeout: 60))
        let stays = app.buttons["Find a stay"]
        scrollTo(stays, in: app); stays.tap()
        XCTAssertTrue(app.staticTexts["Choose the city or area where you want to stay."].waitForExistence(timeout: 20))
        let nationality = app.textFields["Guest nationality (two-letter country code)"]
        finishEntry("DE", in: nationality, app: app)
        let party = app.buttons["Edit travellers and currency"]
        scrollTo(party, in: app); party.tap()
        let adult = app.buttons["Add an adult"]
        scrollTo(adult, in: app); adult.tap()
        let child = app.buttons["Add a child"]
        scrollTo(child, in: app); child.tap()
        let age = app.textFields["Child 1 age (0–17)"]
        finishEntry("6", in: age, app: app)
        let search = app.buttons["Search Pilot"]
        scrollTo(search, in: app); search.tap()
        let result = app.descendants(matching: .any).matching(NSPredicate(
            format: "label == %@ OR label == %@", "Check current provider details", "No options were returned for this search. Try different dates or locations."
        )).firstMatch
        scrollTo(result, in: app, timeout: 60)
    }

    func testPlannerExampleAndBusinessGuideBookmark() {
        let app = XCUIApplication(bundleIdentifier: "com.diasporaunlocked.app")
        app.launch()
        app.open(URL(string: "diasporaunlocked://onesa")!)
        let example = app.buttons["Plan three days in Victoria Falls"]
        XCTAssertTrue(example.waitForExistence(timeout: 25)); example.tap()
        XCTAssertTrue(app.buttons["Open trip planner"].waitForExistence(timeout: 20))
        app.open(URL(string: "diasporaunlocked://business-guides/farming")!)
        XCTAssertTrue(app.buttons["Open farming and food production guide"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.staticTexts["Farming and food production guide"].exists)
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "DU-" + name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
