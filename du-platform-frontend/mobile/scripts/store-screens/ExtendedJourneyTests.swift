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
    func testUncertainContactSurvivesRelaunchAndRetriesOnce() {
        press("Contact us")
        enter("Full name","Release fixture")
        enter("Email address","release-fixture@example.test")
        enter("Subject","Release recovery fixture")
        enter("Message","Isolated support recovery verification", multiline:true)
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
    func testPrivateAssistantDraftSurvivesDeclineAndRevoke() {
        app.open(URL(string:"diasporaunlocked://onesa-ai-chat")!)
        enter("Your message","Private fixture draft",multiline:true)
        press("Keep my draft private")
        XCTAssertEqual(app.textViews["Your message"].value as? String,"Private fixture draft")
        XCTAssertFalse(app.buttons["Send message"].isEnabled)
        press("Review chat sharing")
        press("Allow sharing for this chat")
        XCTAssertTrue(app.buttons["Send message"].isEnabled)
        press("Revoke chat sharing")
        XCTAssertEqual(app.textViews["Your message"].value as? String,"Private fixture draft")
        XCTAssertFalse(app.buttons["Send message"].isEnabled)
    }
    func testInvestmentOpensPublicBusinessDirectory() {
        press("Browse investment research")
        XCTAssertTrue(app.staticTexts["Investment"].waitForExistence(timeout:15))
        press("Open website")
        let web=app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout:35))
        let consent=web.buttons["Essential only"].firstMatch
        if consent.waitForExistence(timeout:5) { consent.tap(); print("PASS essential-only web consent in iPhone browser sheet") }
        let directory=web.links["Search the directory"].firstMatch
        XCTAssertTrue(directory.waitForExistence(timeout:35))
        let visibleArea = web.frame.insetBy(dx: 8,dy: 40)
        var tapped = false
        for _ in 0..<25 {
            let bounds = directory.frame.intersection(visibleArea)
            if !bounds.isNull && bounds.height >= 12 && bounds.width >= 20 {
                let origin=app.coordinate(withNormalizedOffset:CGVector(dx:0,dy:0))
                origin.withOffset(CGVector(dx:bounds.midX,dy:bounds.midY)).tap()
                tapped=true
                break
            }
            let top=web.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.26))
            let bottom=web.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.76))
            if directory.frame.maxY > 0 && directory.frame.maxY < visibleArea.minY {
                top.press(forDuration:0.1,thenDragTo:bottom)
            } else { bottom.press(forDuration:0.1,thenDragTo:top) }
        }
        XCTAssertTrue(tapped,"Directory link never appeared inside the browser viewport")
        let heading=web.descendants(matching:.any).matching(NSPredicate(format:"label CONTAINS[c] %@", "NTIR business directory")).firstMatch
        XCTAssertTrue(heading.waitForExistence(timeout:30))
    }
}
