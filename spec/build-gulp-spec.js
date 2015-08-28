'use strict';

var temp = require('temp');
var path = require('path');
var fs = require('fs-extra');
var specHelpers = require('atom-build-spec-helpers');

describe('gulp provider', function() {
  var directory;
  var workspaceElement;

  var setupGulp = function () {
    var binGulp = path.join(directory, 'node_modules', '.bin', 'gulp');
    var realGulp = path.join(directory, 'node_modules', 'gulp', 'bin', 'gulp.js');
    var source = path.join(__dirname, 'node_modules');
    var target = path.join(directory, 'node_modules');
    return specHelpers.vouch(fs.copy, source, target).then(function () {
      return Promise.all([
        specHelpers.vouch(fs.unlink, binGulp),
        specHelpers.vouch(fs.chmod, realGulp, parseInt('0700', 8))
      ]);
    }).then(function () {
      return specHelpers.vouch(fs.symlink, realGulp, binGulp);
    });
  };

  beforeEach(function () {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);
    jasmine.unspy(window, 'setTimeout');
    jasmine.unspy(window, 'clearTimeout');

    waitsForPromise(function() {
      return specHelpers.vouch(temp.mkdir, 'atom-build-spec-').then(function (dir) {
        return specHelpers.vouch(fs.realpath, dir);
      }).then(function (dir) {
        directory = dir + '/';
        atom.project.setPaths([ directory ]);
      }).then(function () {
        return Promise.all([
          atom.packages.activatePackage('build'),
          atom.packages.activatePackage('build-gulp')
        ]);
      });
    });
  });

  it('should show the build window when a gulp-file exists', function() {
    expect(workspaceElement.querySelector('.build')).not.toExist();

    waitsForPromise(setupGulp);

    runs(function () {
      fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/gulpfile.js'));
      atom.commands.dispatch(workspaceElement, 'build:trigger');
    });

    waitsFor(function() {
      return workspaceElement.querySelector('.build .title') &&
        workspaceElement.querySelector('.build .title').classList.contains('success');
    });

    runs(function() {
      expect(workspaceElement.querySelector('.build')).toExist();
      expect(workspaceElement.querySelector('.build .output').textContent).toMatch(/gulp built/);
    });
  });

  it('should run default target and fail if gulp is not installed', function () {
    fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/gulpfile.js'));
    atom.commands.dispatch(workspaceElement, 'build:trigger');

    waitsFor(function() {
      return workspaceElement.querySelector('.build .title') &&
        workspaceElement.querySelector('.build .title').classList.contains('error');
    });

    runs(function() {
      expect(workspaceElement.querySelector('.build .output').textContent).toMatch(/^Executing: gulp/);
    });
  });

  it('should list gulp targets in a SelectListView', function () {
    waitsForPromise(setupGulp);
    fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/gulpfile.js'));

    runs(function () {
      atom.commands.dispatch(workspaceElement, 'build:select-active-target');
    });

    waitsFor(function () {
      return workspaceElement.querySelector('.select-list li.build-target');
    });

    runs(function () {
      var list = workspaceElement.querySelectorAll('.select-list li.build-target');
      var targets = Array.prototype.slice.call(list).map(function (el) {
        return el.textContent;
      });
      expect(targets).toEqual([ 'Gulp: default', 'Gulp: dev build', 'Gulp: watch' ]);
    });
  });

  it('should still list the default target for gulp even if targetextraction fails', function () {
    fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/gulpfile.js'));

    runs(function () {
      atom.commands.dispatch(workspaceElement, 'build:select-active-target');
    });

    waitsFor(function () {
      return workspaceElement.querySelector('.select-list li.build-target');
    });

    runs(function () {
      var list = workspaceElement.querySelectorAll('.select-list li.build-target');
      var targets = Array.prototype.slice.call(list).map(function (el) {
        return el.textContent;
      });
      expect(targets).toEqual([ 'Gulp: default' ]);
    });
  });
});
