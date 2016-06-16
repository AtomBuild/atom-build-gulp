'use babel';

import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { exec } from 'child_process';

export function provideBuilder() {
  return class GulpBuildProvider extends EventEmitter {
    constructor(cwd) {
      super();
      this.cwd = cwd;
      this.fileWatchers = [];
    }

    destructor() {
      this.fileWatchers.forEach(fw => fw.close());
    }

    getNiceName() {
      return 'gulp';
    }

    isEligible() {
      this.file = [ 'gulpfile.js', 'gulpfile.coffee', 'gulpfile.babel.js' ]
        .map(file => path.join(this.cwd, file))
        .filter(fs.existsSync)
        .slice(0, 1)
        .pop();
      return !!this.file;
    }

    settings() {
      const gulpCommand = () => {
        const executable = process.platform === 'win32' ? 'gulp.cmd' : 'gulp';
        const localPath = path.join(this.cwd, 'node_modules', '.bin', executable);
        return fs.existsSync(localPath) ? localPath : executable;
      }();

      const createConfig = (name, args) => {
        return {
          name: name,
          exec: gulpCommand,
          sh: false,
          args: args,
          env: {
            NODE_ENV: '',
            FORCE_COLOR: '1'
          }
        };
      };

      return new Promise((resolve, reject) => {
        const childEnv = Object.assign({}, process.env);

        delete childEnv.NODE_ENV;
        delete childEnv.NODE_PATH;

        exec(`"${gulpCommand}" --tasks-simple --gulpfile="${this.file}"`, {
          env: childEnv,
          cwd: this.cwd
        }, (error, stdout, stderr) => {
          if (error !== null) {
            atom.notifications.addError('Failed to parse gulpfile to parse gulpfile for targets', {
              detail: (stdout ? 'Output:\n' + stdout + '\n' : '') + 'Error:\n' + stderr,
              dismissable: true,
              icon: 'bug'
            });
            return resolve([ createConfig('Gulp: default', [ 'default' ]) ]);
          }

          const lastRefresh = new Date();
          this.fileWatchers.forEach(fw => fw.close());
          this.fileWatchers.push(fs.watch(this.file, () => {
            if (new Date() - lastRefresh > 3000) this.emit('refresh');
          }));

          const config = [];
          let tasks = stdout.toString().trim();

          if (tasks === '') {
            tasks = [];
          } else {
            tasks = tasks.split('\n');
          }

          /* Make sure 'default' is the first as this will be the prioritized target */
          tasks.sort((t1, t2) => {
            if ('default' === t1) {
              return -1;
            }
            if ('default' === t2) {
              return 1;
            }
            return t1.localeCompare(t2);
          });
          tasks.forEach((task) => {
            config.push(createConfig('Gulp: ' + task, [ task ]));
          });

          return resolve(config);
        });
      });
    }
  };
}
