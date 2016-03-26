'use babel';

import fs from 'fs';
import path from 'path';
import util from 'util';
import { Task } from 'atom';
import EventEmitter from 'events';
import { spawn } from 'child_process';

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
      const createConfig = (name, args) => {
        const executable = /^win/.test(process.platform) ? 'gulp.cmd' : 'gulp';
        const localPath = path.join(this.cwd, 'node_modules', '.bin', executable);
        const exec = fs.existsSync(localPath) ? localPath : executable;
        return {
          name: name,
          exec: exec,
          sh: false,
          args: args,
          env: {
            FORCE_COLOR: '1'
          }
        };
      };

      return new Promise((resolve, reject) => {
        let childEnv = {};

        for (let name in process.env) {
          childEnv[name] = process.env[name];
        }

        delete childEnv.NODE_ENV;
        delete childEnv.NODE_PATH;

        const child = spawn('node', [
          require.resolve(__dirname + '/parser-task.js'),
          this.file
        ], {
          stdio: [ 'ignore', 'ignore', 'ignore', 'ipc' ],
          env: childEnv,
          cwd: this.cwd
        });

        child.once('message', (result) => {
          if (result.error) {
            return resolve([ createConfig('Gulp: default', [ 'default' ]) ]);
          }

          const lastRefresh = new Date();
          this.fileWatchers.forEach(fw => fw.close());
          this.fileWatchers.push(fs.watch(this.file, () => {
            if (new Date() - lastRefresh > 3000) this.emit('refresh');
          }));

          const config = [];
          /* Make sure 'default' is the first as this will be the prioritized target */
          result.tasks.sort((t1, t2) => {
            if ('default' === t1) {
              return -1;
            }
            if ('default' === t2) {
              return 1;
            }
            return t1.localeCompare(t2);
          });
          (result.tasks || []).forEach((task) => {
            config.push(createConfig('Gulp: ' + task, [ task ]));
          });

          return resolve(config);
        });
      });
    }
  };
}
