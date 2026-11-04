# frozen_string_literal: true

# CocoaPods already supplies xcodeproj on the macOS runner. This target lives
# only in the CI checkout, so Expo prebuild never has to preserve hand edits.
require 'xcodeproj'

project_path = ARGV.fetch(0) { abort 'Usage: prepare-ui-tests.rb APP.xcodeproj' }
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'DiasporaUnlocked' && target.product_type == 'com.apple.product-type.application' }
abort 'Expected exactly the DiasporaUnlocked application target' unless app
abort 'Temporary smoke target already exists' if project.targets.any? { |target| target.name == 'DUNativeSmokeUITests' }

test = project.new_target(:ui_test_bundle, 'DUNativeSmokeUITests', :ios, '16.4')
test.add_dependency(app)
source = project.main_group.new_group('DUNativeSmoke', File.expand_path(__dir__))
test.source_build_phase.add_file_reference(source.new_file('DUNativeSmokeTests.swift'))
test.build_configurations.each do |configuration|
  configuration.build_settings.merge!(
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.diasporaunlocked.app.smoketests',
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'SWIFT_VERSION' => '5.0',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'TEST_TARGET_NAME' => app.name,
    'SUPPORTED_PLATFORMS' => 'iphonesimulator',
    'LD_RUNPATH_SEARCH_PATHS' => '$(inherited) @executable_path/Frameworks @loader_path/Frameworks'
  )
end
attributes = project.root_object.attributes['TargetAttributes'] ||= {}
attributes[test.uuid] = { 'TestTargetID' => app.uuid }
project.save

# Do not use the template's stale unit-test reference. The new scheme contains
# only the real application and this real UI-test bundle.
scheme = Xcodeproj::XCScheme.new
scheme.configure_with_targets(app, test)
scheme.test_action.build_configuration = 'Release'
# XCTest's explicit .keepAlways attachments do not retain the automatic video.
# Keep system captures for passing runs too, so secure-input evidence survives.
scheme.test_action.xml_element.attributes['systemAttachmentLifetime'] = 'keepAlways'
scheme.launch_action.build_configuration = 'Release'
scheme.save_as(project.path, 'DUNativeSmoke', true)
puts 'Prepared DUNativeSmoke with the real application and UI-test targets.'
