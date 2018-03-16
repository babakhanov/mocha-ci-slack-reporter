import request from 'sync-request'
const debug = require('debug')('mocha-ci-slack-reporter')
import { reporters } from 'mocha'
const { Base } = reporters

class Reporter extends Base {
  constructor (runner, options) {
    super(runner)

    ;['suite', 'suite end', 'pass', 'fail', 'end'].forEach(e => {
      runner.on(e, this[`${e.replace(' ', '_')}`].bind(this))
    })

    this.passed = []
    this.failed = []
    this.suites = []

    this.options = options.reporterOptions

    debug('Options', this.options)
  }

  suite (suite) {
    debug('Start suite: ', suite.title)

    this.suites.push(suite.title)
  }

  // eslint-disable-next-line
  suite_end () {
    debug('Suite end')

    this.suites.pop()
  }

  pass (test) {
    debug('Test passed: ', test.title)

    this.passed.push({
      suite: this._buildSuiteName(),
      title: test.title,
      duration: test.duration
    })
  }

  fail (test) {
    debug('Test failed: ', test.title)

    this.failed.push({
      suite: this._buildSuiteName(),
      title: test.title,
      duration: test.duration,
      error: test.err
    })
  }

  end () {
    debug('Tests ended')

    const failed = !!this.failed.length

    // should we report passed tests
    if (!failed && this.options.failuresOnly) {
      debug('No failures and failuresOnly is set, so not going to report')

      return
    }

    const message = {
      username: this.options.username,
      text: '',
      channel: this.options.channel,
      attachments: []
    }

    if (failed) {
      debug('Reporting failure')

      message.text = `Failed: ${this.options.testTitle}`
      message.icon_emoji = this.options.failEmoji || ':boom:'

      this.failed.forEach(f => {
        message.attachments.push({
          attachment_type: '',
          text: `Failed: ${f.suite} > ${f.title}`,
          fallback: `Failed: ${f.suite} > ${f.title}\n${f.error}`,
          color: '#e4000a',
          fields: [
            {
              title: '' + f.error,
              short: false
            }
          ]
        })
      })
    } else {
      debug('Reporting success')
      message.icon_emoji = this.options.passEmoji || ':ok_hand:'

      let smallText = '';

      if (this.options.logsUrl) {
       smallText = ` (<${this.options.logsUrl}|View logs>)`
      }

      message.attachments.push({
        attachment_type: '',
        text: `Success: ${this.options.testTitle}${smallText}`,
        color: '#00ae4d'
      });

    }


    debug('Reporting', message)

    request('POST', this.options.url, {
      json: message
    })
  }

  _buildSuiteName () {
    return this.suites.join(' - ')
  }
}

module.exports = Reporter
