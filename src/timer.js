'use strict'

export default class Timer {
  constructor(callback) {
    // Target Time : '2019-10-21T09:00:00'
    // Uncomment the line wanted to test
    this.targetDate = new Date('2019-10-21T09:15:00')
    //this.targetDate = new Date()
    //this.targetDate.setMinutes(this.targetDate.getMinutes() + 10)
    //this.targetDate.setSeconds(this.targetDate.getSeconds() + 40)
    this.callback = callback
    this.checkTime()
  }

  checkTime() {
    const now = Date.now()
    if (now > this.targetDate.getTime()) {
      this.callback({
        type: 'endCountDown',
        value: true,
      })
      return
    }

    let diff = this.targetDate.getTime() - now
    const minutes = new Intl.NumberFormat('fr', {
      minimumIntegerDigits: 2,
      useGrouping: false,
    }).format(Math.floor(diff / (60 * 1000)))
    const seconds = new Intl.NumberFormat('fr', {
      minimumIntegerDigits: 2,
      useGrouping: false,
    }).format(Math.floor((diff % (60 * 1000)) / 1000))
    const lastMinute = diff < 60 * 1000
    this.callback({
      type: 'time',
      value: {
        minutes,
        seconds,
        lastMinute,
        diff,
      },
    })

    window.requestAnimationFrame(this.checkTime.bind(this))
  }
}
