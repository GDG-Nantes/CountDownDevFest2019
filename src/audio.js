'use strict'

export class AudioPlayer {
  constructor() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext
      this.context = new AudioContext()
      this.currentSource = undefined
      this.currentSourceGuitar = undefined
      this.buffer = undefined
      this.bufferGuitar = undefined
      this.forcedStop = false
      this.gainSource = this.context.createGain() // Create gain for source (volume)
      this.gainSourceGuitar = this.context.createGain() // Create gain for source (volume)
      this.gainSource.connect(this.context.destination) // Connect gain to audio Context
      this.gainSourceGuitar.connect(this.context.destination) // Connect gain to audio Context
    } catch (e) {
      console.log('No WebAPI dectect')
    }
  }

  _loadSound(url, bufferToUse) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('GET', url, true)
      request.responseType = 'arraybuffer'

      // Decode asynchronously
      request.onload = () => {
        this.context.decodeAudioData(
          request.response,
          buffer => {
            this.buffer = buffer
            resolve()
          },
          e => {
            reject()
            console.log('Error decoding file', e)
          },
        )
      }
      request.send()
    })
  }
  _loadSoundGuitar(url, bufferToUse) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('GET', url, true)
      request.responseType = 'arraybuffer'

      // Decode asynchronously
      request.onload = () => {
        this.context.decodeAudioData(
          request.response,
          buffer => {
            this.bufferGuitar = buffer
            resolve()
          },
          e => {
            reject()
            console.log('Error decoding file', e)
          },
        )
      }
      request.send()
    })
  }

  /*****************************
   ******************************
   * Apis exposed
   ******************************
   ******************************
   */

  loadSong(songPath, song) {
    return this._loadSound(`${songPath}/${song.song}`).then(_ => {
      if (song.guitar) {
        return this._loadSoundGuitar(`${songPath}/${song.guitar}`)
      } else {
        this.bufferGuitar = undefined
        return
      }
    })
  }

  play(mute, callbackEndMusic) {
    return new Promise((resolve, reject) => {
      //this.stop()
      const source = this.context.createBufferSource() // creates a sound source
      let sourceGuitar = undefined // creates a sound source
      if (this.bufferGuitar) {
        sourceGuitar = this.context.createBufferSource()
      } // creates a sound source
      source.buffer = this.buffer // tell the source which sound to play
      if (this.bufferGuitar) {
        sourceGuitar.buffer = this.bufferGuitar
      } // tell the source which sound to play
      //source.connect(this.context.destination) // connect the source to the context's destination (the speakers)
      //sourceGuitar.connect(this.context.destination) // connect the source to the context's destination (the speakers)
      source.connect(this.gainSource)
      if (this.bufferGuitar) {
        sourceGuitar.connect(this.gainSourceGuitar)
      }
      if (!mute) {
        source.start(0) // play the source now
        if (this.bufferGuitar) {
          sourceGuitar.start(0) // play the source now
        }
      }
      this.currentSource = source
      if (this.bufferGuitar) {
        this.currentSourceGuitar = sourceGuitar
      }
      source.addEventListener('ended', _ => {
        if (!this.forcedStop) {
          callbackEndMusic(true)
        } else {
          this.forcedStop = false
        }
      }) // plug the callback when the song is terminated
      resolve({ source, sourceGuitar })
    })
  }

  stop() {
    if (this.currentSource && this.currentSource.stop) {
      this.forcedStop = true
      this.currentSource.stop(0)
      if (this.bufferGuitar) {
        this.currentSourceGuitar.stop(0)
      }
    }
  }

  time() {
    return this.context.currentTime
  }

  /**
   * Update the sound volume of audio element
   */
  manageSoundVolume(delta) {
    if (delta < 10 * 1000) {
      this.gainSource.gain.value = Math.min(Math.max(0, delta / (10 * 1000)), 0.7)
      if (this.bufferGuitar) {
        this.gainSourceGuitar.gain.value = Math.min(Math.max(0, delta / (10 * 1000)), 0.7)
      }
    }
  }

  manageVolumeFromPercent(percent) {
    if (percent > 0) {
      this.gainSource.gain.value = Math.min(percent, 1)
      if (this.bufferGuitar) {
        this.gainSourceGuitar.gain.value = Math.min(percent, 1)
      }
    }
  }
}
