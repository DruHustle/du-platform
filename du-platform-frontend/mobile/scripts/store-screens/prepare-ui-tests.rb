# frozen_string_literal: true
require 'xcodeproj'

project = Xcodeproj::Project.open(ARGV.fetch(0))
app = project.targets.find { |target| target.name == 'DiasporaUnlocked' && target.product_type == 'com.apple.product-type.application' }
abort 'Missing DiasporaUnlocked application' unless app
# Add a test-only scheme in the disposable checkout; keep the shipped project intact.
test = project.new_target(:ui_test_bundle, 'DUNativeSmokeUITests', :ios, '16.4')
test.add_dependency(app)
source = project.main_group.new_group('StoreScreens', File.expand_path(__dir__))
test.source_build_phase.add_file_reference(source.new_file('DUNativeSmokeTests.swift'))
test.build_configurations.each do |configuration|
  configuration.build_settings.merge!(
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.diasporaunlocked.app.smoketests',
    'PRODUCT_NAME' => '$(TARGET_NAME)', 'SWIFT_VERSION' => '5.0',
    'GENERATE_INFOPLIST_FILE' => 'YES', 'TARGETED_DEVICE_FAMILY' => '1,2',
    'TEST_TARGET_NAME' => app.name, 'SUPPORTED_PLATFORMS' => 'iphonesimulator',
    'LD_RUNPATH_SEARCH_PATHS' => '$(inherited) @executable_path/Frameworks @loader_path/Frameworks'
  )
end
(project.root_object.attributes['TargetAttributes'] ||= {})[test.uuid] = { 'TestTargetID' => app.uuid }
project.save
scheme = Xcodeproj::XCScheme.new
scheme.configure_with_targets(app, test)
scheme.test_action.build_configuration = 'Release'
scheme.launch_action.build_configuration = 'Release'
scheme.save_as(project.path, 'DUNativeSmoke', true)
