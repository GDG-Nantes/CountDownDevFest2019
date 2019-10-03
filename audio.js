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

  loadSong(songPath) {
    return this._loadSound(`${songPath}/song.ogg`).then(_ =>
      this._loadSoundGuitar(`${songPath}/guitar.ogg`),
    )
  }

  play(mute, callbackEndMusic) {
    return new Promise((resolve, reject) => {
      const source = this.context.createBufferSource() // creates a sound source
      const sourceGuitar = this.context.createBufferSource() // creates a sound source
      source.buffer = this.buffer // tell the source which sound to play
      sourceGuitar.buffer = this.bufferGuitar // tell the source which sound to play
      //source.connect(this.context.destination) // connect the source to the context's destination (the speakers)
      //sourceGuitar.connect(this.context.destination) // connect the source to the context's destination (the speakers)
      source.connect(this.gainSource)
      sourceGuitar.connect(this.gainSourceGuitar)
      if (!mute) {
        source.start(0) // play the source now
        sourceGuitar.start(0) // play the source now
      }
      this.currentSource = source
      this.currentSourceGuitar = sourceGuitar
      source.addEventListener('ended', _ => callbackEndMusic(true)) // plug the callback when the song is terminated
      resolve({ source, sourceGuitar })
    })
  }

  stop() {
    if (this.currentSource && this.currentSource.stop) {
      this.currentSource.stop(0)
      this.currentSourceGuitar.stop(0)
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
      this.gainSourceGuitar.gain.value = Math.min(Math.max(0, delta / (10 * 1000)), 0.7)
    }
  }

  manageVolumeFromPercent(percent) {
    if (percent > 0) {
      this.gainSource.gain.value = Math.min(percent, 1)
      this.gainSourceGuitar.gain.value = Math.min(percent, 1)
    }
  }
}
