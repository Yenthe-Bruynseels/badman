const standardVersion = require('standard-version');
const runExecFile = require('./run-execFile');
const runExec = require('./run-exec');
const core = require('@actions/core');

standardVersion({
  infile: 'apps/client/src/assets/CHANGELOG.md',
  silent: false,
  skip: {
    commit: true,
    tag: true,
  },
})
  .then(async () => {
    try {
      // get base and head from input args
      const [, , base, head] = process.argv;

      // get the version number from the package.json
      const pkg = require('../package.json');
      const version = pkg.version;
      const currentBranch = await runExecFile('', 'git', [
        'branch',
        '--show-current',
      ]);

      core.debug(`currentBranch: ${currentBranch}`);

      // run `nx update helm` to update the helm chart
      await runExec(
        '',
        `npx nx affected --target=update-version  --newVersion=${version} ${base} ${head}`
      );

      // Git add .
      await runExecFile('', 'git', ['add', '.']);

      // Git commit
      await runExecFile('', 'git', [
        'commit',
        '-m',
        `chore(release): ${version}`,
      ]);

      // Git tag with annotation
      await runExecFile('', 'git', [
        'tag',
        `v${version}`,
        `-m`,
        `chore(release): ${version}`,
      ]);

      // Git push
      await runExecFile('', 'git', [
        'push',
        '--follow-tags',
        'origin',
        currentBranch.trim(),
      ]);
    } catch (err) {
      core.setFailed(err);
    }
  })
  .catch((err) => {
    console.error(`standard-version failed with message: ${err.message}`);
  });
