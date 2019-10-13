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

  // We watch for close instructions click to start the game
  const instructionElt = document.querySelector('.instructions')
  const closeInstructionElt = document.querySelector('.close-instructions')

  closeInstructionElt.addEventListener('click', _ => {
    instructionElt.style.display = 'none'
    const input = document.getElementById('pseudo').value
    game.setPseudo(input)
    game.startSong()
    if (!countDownMode) {
      // We listen to change in firebase to change of song
      game.listenToChange()
    }
  })
})
