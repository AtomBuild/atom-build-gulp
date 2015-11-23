'use babel';
'use strict';

const originalNodePath = process.env.NODE_PATH;

import fs from 'fs';
import path from 'path';
import util from 'util';

export function provideBuilder() {
  return {
    niceName: 'gulp',

    isEligable: function (cwd) {
      return fs.existsSync(path.join(cwd, 'gulpfile.js')) ||
        fs.existsSync(path.join(cwd, 'gulpfile.coffee')) ||
        fs.existsSync(path.join(cwd, 'gulpfile.babel.js'));
    },

    settings: function (cwd) {
      const createConfig = (name, args) => {
        const executable = /^win/.test(process.platform) ? 'gulp.cmd' : 'gulp';
        const localPath = path.join(cwd, 'node_modules', '.bin', executable);
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
        process.env.NODE_PATH = util.format('%s%snode_modules%s%s', cwd, path.sep, path.delimiter, originalNodePath);

        require('atom').Task.once(require.resolve('./parser-task.js'), cwd, (result) => {
          if (result.error) {
            process.env.NODE_PATH = originalNodePath;
            return resolve([ createConfig('Gulp: default', [ 'default' ]) ]);
          }

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
