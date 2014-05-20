require "bundler/gem_tasks"

require 'jasmine'
require 'rspec/core/rake_task'
load 'jasmine/tasks/jasmine.rake'

RSpec::Core::RakeTask.new(:spec)

task :default => [:spec, 'jasmine:ci']
