const fs = require('fs-extra')

const {Fixture} = require('../helper')
const {EventMatcher} = require('../matcher');

[false, true].forEach(poll => {
  describe(`unpaired rename events with poll = ${poll}`, function () {
    let fixture, matcher

    beforeEach(async function () {
      fixture = new Fixture()
      await fixture.before()
      await fixture.log()

      matcher = new EventMatcher(fixture)
      await matcher.watch([], {poll})
    })

    afterEach(async function () {
      await fixture.after(this.currentTest)
    })

    it('when a file is renamed from outside of the watch root in', async function () {
      const outsideFile = fixture.fixturePath('file.txt')
      const insideFile = fixture.watchPath('file.txt')

      await fs.writeFile(outsideFile, 'contents')
      await fs.rename(outsideFile, insideFile)

      await until('the creation event arrives', matcher.allEvents(
        {action: 'created', kind: 'file', path: insideFile}
      ))
    })

    it('when a file is renamed from inside of the watch root out', async function () {
      const outsideFile = fixture.fixturePath('file.txt')
      const insideFile = fixture.watchPath('file.txt')
      const flagFile = fixture.watchPath('flag.txt')

      await fs.writeFile(insideFile, 'contents')

      await until('the creation event arrives', matcher.allEvents(
        {action: 'created', kind: 'file', path: insideFile}
      ))

      await fs.rename(insideFile, outsideFile)
      await fs.writeFile(flagFile, 'flag 1')

      await until('the flag file event arrives', matcher.allEvents(
        {action: 'created', kind: 'file', path: flagFile}
      ))

      // Trigger another batch of events on Linux
      await fs.writeFile(flagFile, 'flag 2')

      await until('the deletion event arrives', matcher.allEvents(
        {action: 'deleted', kind: 'file', path: insideFile}
      ))
    })
  })
})
