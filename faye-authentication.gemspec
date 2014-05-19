# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'faye/authentication/version'

Gem::Specification.new do |spec|
  spec.name          = "faye-authentication"
  spec.version       = Faye::Authentication::VERSION
  spec.authors       = ["Adrien Siami"]
  spec.email         = ["adrien.siami@dimelo.com"]
  spec.summary       = %q{TODO: Write a short summary. Required.}
  spec.description   = %q{TODO: Write a longer description. Optional.}
  spec.homepage      = ""
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler", "~> 1.6"
  spec.add_development_dependency "rake"
  spec.add_development_dependency 'rspec', '~> 3.0.0.rc1'
  spec.add_development_dependency 'jasmine', '~> 2.0.1'
  spec.add_development_dependency 'faye', '~> 1.0.1'
  spec.add_development_dependency 'rack'
  spec.add_development_dependency 'thin'
end
