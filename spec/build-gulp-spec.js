'use babel';

import temp from 'temp';
import path from 'path';
import fs from 'fs-extra';
import specHelpers from 'atom-build-spec-helpers';
import { provideBuilder } from '../lib/gulp';

describe('gulp provider', () => {
  let directory;
  let builder;
  const Builder = provideBuilder();

  const setupGulp = (preset) => {
    const binGulp = path.join(directory, 'node_modules', '.bin', 'gulp');
    const realGulp = path.join(directory, 'node_modules', 'gulp', 'bin', 'gulp.js');
    const source = path.join(__dirname, 'fixture', `node_modules_${preset}`);
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
        .then((dir) => {
          directory = `${dir}/`;
          builder = new Builder(directory);
          atom.project.setPaths([ directory ]);
        });
    });
  });

  afterEach(() => {
    fs.removeSync(directory);
  });

  describe('when no gulpfile (any extension) exists', () => {
    it('should not be eligible', () => {
      expect(builder.isEligible()).toEqual(false);
    });
  });

  describe('when gulpfile.js exists with locally installed gulp', () => {
    beforeEach(() => {
      waitsForPromise(setupGulp.bind(null, 'gulp'));
      runs(() => fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/fixture/gulpfile.js')));
    });

    it('should be eligible', () => {
      expect(builder.isEligible()).toEqual(true);
    });

    it('should use gulp to list targets', () => {
      expect(builder.isEligible()).toBe(true);
      waitsForPromise(() => {
        return builder.settings().then(settings => {
          const expected = [ 'Gulp: default', 'Gulp: dev build', 'Gulp: watch' ].sort();
          const real = settings.map(s => s.name).sort();
          expect(expected).toEqual(real);
        });
      });
    });

    it('should export correct settings', () => {
      waitsForPromise(() => {
        expect(builder.isEligible()).toBe(true);
        return builder.settings().then(settings => {
          expect(settings.length).toBe(3);
          const target = settings.find(s => s.name === 'Gulp: watch');
          expect(target.sh).toBe(false);
          expect(target.args).toEqual([ 'watch' ]);
          expect(target.exec).toBe(`${directory}node_modules/.bin/gulp`);
        });
      });
    });

    it('should refresh targets when gulpfile.js is altered', () => {
      waitsForPromise(() => {
        expect(builder.isEligible()).toBe(true);
        return builder.settings().then(settings => {
          expect(settings.length).toBe(3);
        });
      });

      runs(() => fs.appendFileSync(`${directory}/gulpfile.js`, `\ngulp.task("new task", [ "default" ]);\n`));

      waitsForPromise(() => {
        expect(builder.isEligible()).toBe(true);
        return builder.settings().then(settings => {
          expect(settings.length).toBe(4);
          const target = settings.find(s => s.name === 'Gulp: new task');
          expect(target.args).toEqual([ 'new task' ]);
        });
      });
    });
  });

  describe('when gulpfile.js exists but no local gulp is installed', () => {
    beforeEach(() => {
      fs.writeFileSync(directory + 'gulpfile.js', fs.readFileSync(__dirname + '/fixture/gulpfile.js'));
    });

    it('should be eligible', () => {
      expect(builder.isEligible()).toEqual(true);
    });

    it('should list the default target', () => {
      waitsForPromise(() => {
        expect(builder.isEligible()).toEqual(true);
        return builder.settings().then(settings => {
          const expected = [ 'Gulp: default' ];
          const real = settings.map(s => s.name);
          expect(expected).toEqual(real);
        });
      });
    });

    it('should export correct settings', () => {
      waitsForPromise(() => {
        expect(builder.isEligible()).toEqual(true);
        return builder.settings().then(settings => {
          expect(settings.length).toBe(1);
          const target = settings.find(s => s.name === 'Gulp: default');
          expect(target.sh).toBe(false);
          expect(target.args).toEqual([ 'default' ]);
          expect(target.exec).toBe('gulp');
        });
      });
    });
  });

  describe('when gulpfile.babel.js exists with locally installed gulp', () => {
    beforeEach(() => {
      waitsForPromise(setupGulp.bind(null, 'babel'));
      runs(() => fs.writeFileSync(directory + 'gulpfile.babel.js', fs.readFileSync(__dirname + '/fixture/gulpfile.babel.js')));
      runs(() => fs.writeFileSync(directory + '.babelrc', fs.readFileSync(__dirname + '/fixture/.babelrc')));
    });

    it('should export correct settings', () => {
      expect(builder.isEligible()).toEqual(true);
      waitsForPromise(() => {
        return builder.settings().then(settings => {
          expect(settings.length).toBe(2);
          expect(settings.map(s => s.name).sort()).toEqual([ 'Gulp: babel-task-1', 'Gulp: babel-task-2' ].sort());
          const target = settings.find(s => s.name === 'Gulp: babel-task-1');
          expect(target.sh).toBe(false);
          expect(target.args).toEqual([ 'babel-task-1' ]);
          expect(target.exec).toBe(`${directory}node_modules/.bin/gulp`);
        });
      });
    });
  });

  describe('when gulpfile.coffee exists with locally installed gulp', () => {
    beforeEach(() => {
      waitsForPromise(setupGulp.bind(null, 'coffee'));
      runs(() => fs.writeFileSync(directory + 'gulpfile.coffee', fs.readFileSync(__dirname + '/fixture/gulpfile.coffee')));
    });

    it('should export correct settings', () => {
      expect(builder.isEligible()).toEqual(true);
      waitsForPromise(() => {
        return builder.settings().then(settings => {
          expect(settings.length).toBe(2);
          expect(settings.map(s => s.name).sort()).toEqual([ 'Gulp: coffee-task-1', 'Gulp: coffee-task-2' ].sort());
          const target = settings.find(s => s.name === 'Gulp: coffee-task-1');
          expect(target.sh).toBe(false);
          expect(target.args).toEqual([ 'coffee-task-1' ]);
          expect(target.exec).toBe(`${directory}node_modules/.bin/gulp`);
        });
      });
    });
  });
});
