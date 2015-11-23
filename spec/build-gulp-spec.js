'use babel';

import temp from 'temp';
import path from 'path';
import fs from 'fs-extra';
import specHelpers from 'atom-build-spec-helpers';
import { provideBuilder } from '../lib/gulp';

describe('gulp provider', () => {
  let directory;
  const builder = provideBuilder();

  const setupGulp = () => {
    const binGulp = path.join(directory, 'node_modules', '.bin', 'gulp');
    const realGulp = path.join(directory, 'node_modules', 'gulp', 'bin', 'gulp.js');
    const source = path.join(__dirname, 'fixture/node_modules');
    const target = path.join(directory, 'node_modules');
    return specHelpers.vouch(fs.copy, source, target).then(() => {
      return Promise.all([
        specHelpers.vouch(fs.unlink, binGulp),
        specHelpers.vouch(fs.chmod, realGulp, parseInt('0700', 8))
      ]);
    }).then(() => {
      return specHelpers.vouch(fs.symlink, realGulp, binGulp);
    });
  };

  beforeEach(() => {
    waitsForPromise(() => {
      return specHelpers.vouch(temp.mkdir, 'atom-build-spec-')
        .then((dir) => specHelpers.vouch(fs.realpath, dir))
        .then((dir) => atom.project.setPaths([ directory = `${dir}/` ]));
    });
  });

  afterEach(() => {
    fs.removeSync(directory);
  });

  describe('when gulpfile.js with locally installed gulp', () => {
    beforeEach(() => {
      waitsForPromise(setupGulp);
      runs(() => fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/fixture/gulpfile.js')));
    });

    it('should be eligible', () => {
      runs(() => expect(builder.isEligable(directory)).toEqual(true));
    });

    it('should use gulp to list targets', () => {
      waitsForPromise(() => {
        return builder.settings(directory).then(settings => {
          const expected = [ 'Gulp: default', 'Gulp: dev build', 'Gulp: watch' ].sort();
          const real = settings.map(s => s.name).sort();
          expect(expected).toEqual(real);
        });
      });
    });
  });

  describe('when gulpfile.js exists but no local gulp is installed', () => {
    beforeEach(() => {
      fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/fixture/gulpfile.js'));
    });

    it('should be eligible', () => {
      runs(() => expect(builder.isEligable(directory)).toEqual(true));
    });

    it('should list the default target', () => {
      waitsForPromise(() => {
        return builder.settings(directory).then(settings => {
          const expected = [ 'Gulp: default' ];
          const real = settings.map(s => s.name);
          expect(expected).toEqual(real);
        });
      });
    });
  });
});
