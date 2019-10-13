import Game from './game'

document.addEventListener('DOMContentLoaded', () => {
  const countDownMode = location.hash && location.hash === '#countdown'
  document
    .getElementById('game-canvas')
    .classList.add(countDownMode ? 'countdown-mode' : 'mobile-mode')
  let game = new Game(countDownMode)

  const instructionElt = document.querySelector('.instructions')
  const closeInstructionElt = document.querySelector('.close-instructions')

  closeInstructionElt.addEventListener('click', _ => {
    instructionElt.style.display = 'none'
    const input = document.getElementById('pseudo').value
    game.setPseudo(input)
    game.startGame()
    if (!countDownMode) {
      game.listenToChange()
    }
  })
})
