# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'faye/authentication/version'

Gem::Specification.new do |spec|
  spec.name          = "faye-authentication"
  spec.version       = Faye::Authentication::VERSION
  spec.authors       = ["Adrien Siami", "Adrien Rey-Jarthon", "Cyril Le Roy", "Fabien Chaynes"]
  spec.email         = ["adrien.siami@gmail.com", "jobs@adrienjarthon.com", "cyril.leroy44@gmail.com", "fabien.chaynes@ringcentral.com"]
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

  spec.add_development_dependency 'bundler'
  spec.add_development_dependency 'rake'
  spec.add_development_dependency 'rspec'
  spec.add_development_dependency 'rspec-eventmachine'
  spec.add_development_dependency 'jasmine'
  spec.add_development_dependency 'chrome_remote'
  spec.add_development_dependency 'rack'
  spec.add_development_dependency 'thin'
  spec.add_development_dependency 'webmock'
end
