// KEY LOGIC ADAPTED FROM https://github.com/nklsrh/BuildNewGames_ThreeJSGame/blob/gh-pages/Scripts/keyboard.js
// Will use this Key.isDown boolean to test if it is being pressed at the right time.

class Touch {
  constructor() {
    this._pressed = {}
    this._pressedVisually = {}
    this.pos = {
      1: 65,
      2: 83,
      3: 68,
    }
    this.A = 65 // songNote.pos: 1
    this.S = 83 // songNote.pos: 2
    this.D = 68 // songNote.pos: 3

    this.addTouchListeners()
  }

  checkTouch(touches) {
    // We only takes touchs that are take at the bottom of the screen
    return [...touches].filter(touch => touch.screenY > (window.screen.height * 2) / 3)
  }

  checkTouchAnote(touches) {
    return touches.filter(touch => touch.screenX < window.screen.width / 3)
  }
  checkTouchSnote(touches) {
    return touches.filter(
      touch =>
        touch.screenX > window.screen.width / 3 && touch.screenX < (window.screen.width * 2) / 3,
    )
  }
  checkTouchDnote(touches) {
    return touches.filter(touch => touch.screenX > (window.screen.width * 2) / 3)
  }

  addTouchListeners() {
    window.addEventListener('touchstart', e => {
      this.onTouchdown(e)
    })
    window.addEventListener('touchend', e => {
      this.onTouchup(e)
    })
  }

  isDown(keyCode) {
    return this._pressed[keyCode]
  }

  isDownVisually(keyCode) {
    return this._pressedVisually[keyCode]
  }

  onTouchdown(e) {
    console.log(e)
    const filtersTouchs = this.checkTouch(e.touches)
    let keyPressed = []
    if (this.checkTouchAnote(filtersTouchs).length > 0) {
      keyPressed.push(this.A)
    }
    if (this.checkTouchSnote(filtersTouchs).length > 0) {
      keyPressed.push(this.S)
    }
    if (this.checkTouchDnote(filtersTouchs).length > 0) {
      keyPressed.push(this.D)
    }
    if (keyPressed.length > 0) {
      keyPressed.map(key => {
        this._pressed[key] = true
        this._pressedVisually[key] = true
      })
    }
  }

  onTouchup(e) {
    console.log(e)
    const filtersTouchs = this.checkTouch(e.changedTouches)
    let keyPressed = []
    if (this.checkTouchAnote(filtersTouchs).length > 0) {
      keyPressed.push(this.A)
    }
    if (this.checkTouchSnote(filtersTouchs).length > 0) {
      keyPressed.push(this.S)
    }
    if (this.checkTouchDnote(filtersTouchs).length > 0) {
      keyPressed.push(this.D)
    }
    if (keyPressed.length > 0) {
      keyPressed.map(key => {
        delete this._pressedVisually[key]
        let buffer = 300 // buffer for leniency
        setTimeout(() => {
          delete this._pressed[key]
        }, buffer)
      })
    }
  }
}

export default Touch
