# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'faye/authentication/version'

Gem::Specification.new do |spec|
  spec.name          = "faye-authentication"
  spec.version       = Faye::Authentication::VERSION
  spec.authors       = ["Adrien Siami"]
  spec.email         = ["adrien.siami@dimelo.com"]
  spec.summary       =
  spec.description   = "A faye extension to add authentication mechanisms"
  spec.homepage      = "https://github.com/jarthod/faye-authentication"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_runtime_dependency 'jwt', '>= 1.2'
  spec.add_runtime_dependency 'faye', '>= 1.0'

  spec.add_development_dependency "bundler", "~> 1.5"
  spec.add_development_dependency "rake", '~> 10.3'
  spec.add_development_dependency 'rspec', '~> 3.0'
  spec.add_development_dependency 'rspec-eventmachine', '~> 0.2'
  spec.add_development_dependency 'jasmine', '~> 2.0'
  spec.add_development_dependency 'rack', '~> 1.5'
  spec.add_development_dependency 'thin', '~> 1.6'
  spec.add_development_dependency 'webmock', '~> 1.18'
end
