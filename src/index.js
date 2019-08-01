import Game from './game'

document.addEventListener('DOMContentLoaded', () => {
  const countDownMode = location.hash && location.hash === '#countdown'
  let game = new Game(countDownMode)

  const instructionElt = document.querySelector('.instructions')
  const closeInstructionElt = document.querySelector('.close-instructions')

  closeInstructionElt.addEventListener('click', _ => {
    instructionElt.style.display = 'none'
    game.startGame()
  })
})
