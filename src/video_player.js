'use strict'

/**
 * Class for playing video
 *
 */
export class VideoPlayer {
  constructor(parentElt, callBackEnd) {
    this.videoElt = document.createElement('video')
    parentElt.appendChild(this.videoElt)
    this.videoName = 'Motion_Devfest_V2.mp4'
    this.callBackEnd = callBackEnd
    // Hack to force to download the video
    this.videoElt.muted = true
    this.videoElt.pause()
    this.videoElt.src = `./assets/video/${this.videoName}`
    this.videoElt.play()
  }

  /**
   * Reset the video to 0
   */
  resetVideo() {
    this.videoElt.pause()
    this.videoElt.currentTime = 0
    this.videoElt.style.display = 'none'
  }

  /**
   * Play the video
   */
  playVideo() {
    this.videoElt.style.display = ''
    this.videoElt.muted = false
    this.videoElt.pause()
    this.videoElt.src = `./assets/video/${this.videoName}`
    this.videoElt.play()
    this.videoElt.onended = this.callBackEnd.bind(this)
  }
}
