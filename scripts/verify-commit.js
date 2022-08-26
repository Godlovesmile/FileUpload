const msgPath = process.env.HUSKY_GIT_PARAMS || '.git/COMMIT_EDITMSG'
const msg = require('fs').readFileSync(msgPath, 'utf-8').trim()
const commitRE =
  /^(revert: )?(feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(\(.+\))?: .{1,50}/

if (!commitRE.test(msg)) {
  console.log()
  console.log('\x1B[31m%s\x1B[0m', '\n⚡ 不要搞事年轻人，请按 commit 格式提交!\n')
  console.log(
    '\x1B[31m%s\x1B[0m',
    '[feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release]\n',
  )
  process.exit(1)
}
