'use babel';

const originalNodePath = process.env.NODE_PATH;

import fs from 'fs';
import path from 'path';
import util from 'util';
import { Task } from 'atom';
import EventEmitter from 'events';

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
          args: args
        };
      };

      return new Promise((resolve, reject) => {
        /* This is set so that the spawned Task gets its own instance of gulp */
        process.env.NODE_PATH = util.format('%s%snode_modules%s%s', this.cwd, path.sep, path.delimiter, originalNodePath);

        Task.once(require.resolve(__dirname + '/parser-task.js'), this.cwd, this.file, (result) => {
          if (result.error) {
            process.env.NODE_PATH = originalNodePath;
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

          process.env.NODE_PATH = originalNodePath;
          return resolve(config);
        });
      });
    }
  };
}
