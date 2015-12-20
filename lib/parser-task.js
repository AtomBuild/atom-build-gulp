'use babel';

/**
 * This has to be done in a separate task since gulp depends
 * on stuff that does unsafe evals. We don't want, and are not
 * allowed to do this in the context of the Atom application.
 */

export default (path, file) => {
  try {
    const gulp = require(`${path}/node_modules/gulp`);

    /* eslint-disable no-native-reassign, no-undef */
    /* When spawning this, we are not a browser anymore. Disable these */
    navigator = undefined;
    window = undefined;
    document = undefined;
    /* eslint-enable no-native-reassign, no-undef */

    require(file);
    return { tasks: Object.keys(gulp.tasks) };
  } catch (e) {
    return { error: { message: e.message || e.code } };
  }
};
