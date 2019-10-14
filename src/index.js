import Game from './game'

document.addEventListener('DOMContentLoaded', () => {
  // We check if the url contains Hash "countdown" to know if we're on countdown mode
  const countDownMode = location.hash && location.hash === '#countdown'
  // We set a special class according to mode to hide or show some elements of the page
  document
    .getElementById('game-canvas')
    .classList.add(countDownMode ? 'countdown-mode' : 'mobile-mode')

  // We init the engine
  let game = new Game(countDownMode)
  let fullscreenMode = false

  // We watch for close instructions click to start the game
  const instructionElt = document.querySelector('.instructions')
  const closeInstructionElt = document.querySelector('.close-instructions')

  closeInstructionElt.addEventListener('click', _ => {
    toggleFullScreen()
    instructionElt.style.display = 'none'
    const input = document.getElementById('pseudo').value
    game.setPseudo(input)
    game.startSong()
    if (!countDownMode) {
      // We listen to change in firebase to change of song
      game.listenToChange()
    }
  })

  function toggleFullScreen() {
    const elem = document.getElementById('game-canvas')
    if (fullscreenMode) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.mozCancelFullScreen) {
        /* Firefox */
        document.mozCancelFullScreen()
      } else if (document.webkitExitFullscreen) {
        /* Chrome, Safari and Opera */
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        /* IE/Edge */
        document.msExitFullscreen()
      }
    } else {
      if (elem.requestFullscreen) {
        elem.requestFullscreen()
      } else if (elem.mozRequestFullScreen) {
        /* Firefox */
        elem.mozRequestFullScreen()
      } else if (elem.webkitRequestFullscreen) {
        /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen()
      } else if (elem.msRequestFullscreen) {
        /* IE/Edge */
        elem.msRequestFullscreen()
      }
    }
    fullscreenMode = !fullscreenMode
  }
})
