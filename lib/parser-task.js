'use babel';

/**
 * This has to be done in a separate task since gulp depends
 * on stuff that does unsafe evals. We don't want, and are not
 * allowed to do this in the context of the Atom application.
 */

let gulp;
try {
  gulp = require('gulp');
} catch (e) { /* do nothing */ }

export default (path) => {
  try {
    if (!gulp) {
      throw new Error('Gulp is not installed.');
    }

    process.chdir(path);

    /* eslint-disable no-native-reassign, no-undef */
    /* When spawning this, we are not a browser anymore. Disable these */
    navigator = undefined;
    window = undefined;
    /* eslint-enable no-native-reassign, no-undef */

    require(path + '/gulpfile.js');
    return { tasks: Object.keys(gulp.tasks) };
  } catch (e) {
    return { error: { message: e.message } };
  }
};
