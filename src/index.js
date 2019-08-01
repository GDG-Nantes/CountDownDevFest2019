import Game from "./game";

document.addEventListener("DOMContentLoaded", () => {
  let game = new Game();

  const instructionElt = document.querySelector('.instructions');
  const closeInstructionElt = document.querySelector('.close-instructions');

  closeInstructionElt.addEventListener('click', _=>instructionElt.style.display = 'none');
  
});
