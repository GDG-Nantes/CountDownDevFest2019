class GameNotes {
  constructor(noteInterval, musicDelay, key) {
    this.noteInterval = noteInterval
    this.musicDelay = musicDelay
    this.key = key

    this.scoreEl = document.getElementsByClassName('score')[0]
    this.maxStreakEl = document.getElementsByClassName('max-streak')[0]
    this.streakEl = document.getElementsByClassName('streak')[0]
    this.multiplierEl = document.getElementsByClassName('multiplier')[0]
    this.countdownEl = document.getElementsByClassName('countdown')[0]
    this.currentSongEl = document.getElementsByClassName('current-song')[0]

    // Score
    this.score = 0
    // Max Combo
    this.maxStreak = 0
    // Multiplier according to hits
    this.multiplier = 1
    // Current combo
    this.hits = 0
  }

  incrementHits() {
    this.hits++
    if (this.hits > this.maxStreak) {
      this.maxStreak = this.hits
    }
  }

  /**
   * refresh all score
   */
  resetScores() {
    this.score = 0
    this.maxStreak = 0
    this.multiplier = 1
    this.hits = 0
    this.refreshScore()
  }

  resetHits() {
    this.hits = 0
    this.refreshScore()
  }

  incrementScore() {
    this.multiplier = 1
    if (this.hits === 30) {
      this.multiplier = 4
    } else if (this.hits === 20) {
      this.multiplier = 3
    } else if (this.hits === 10) {
      this.multiplier = 2
    }
    this.score += 100 * Number(this.multiplier)
    this.refreshScore()
  }

  refreshScore() {
    this.scoreEl.innerHTML = `Score: ${this.score}`
    this.maxStreakEl.innerHTML = `Max Streak: ${this.maxStreak}`
    this.streakEl.innerHTML = `Streak: ${this.hits}`
    this.multiplierEl.innerHTML = `Multiplier: ${this.multiplier}X`
  }

  setTime(timeData) {
    this.countdownEl.innerHTML = `${timeData.minutes}:${timeData.seconds}`
  }

  setCurrentSong(currentSonTitle) {
    this.currentSongEl.innerHTML = currentSonTitle
  }

  getScore() {
    return this.score
  }
}

export default GameNotes
