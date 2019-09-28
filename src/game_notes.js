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

    this.score = 0
    this.maxStreak = 0
    this.streak = 0
    this.multiplier = 1
    this.hits = 0
    this.misses = 0
    this.totalNotes = 0
  }

  setNoteCheck(songNote, time) {
    let timeDelay = 260 + this.musicDelay + time

    setTimeout(() => this.checkNote(songNote.pos), timeDelay)
  }

  setNoteCheckNew(pos, time) {
    let timeDelay = 260 + this.musicDelay + time

    setTimeout(() => this.checkNote(pos), timeDelay)
  }

  incrementHits() {
    this.hits++
    if (this.hits > this.maxStreak) {
      this.maxStreak = this.hits
    }
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

  checkNote(pos) {
    if (this.key.isDown(this.key.pos[pos])) {
      if (this.streak === 30) {
        this.multiplier = 4
      } else if (this.streak === 20) {
        this.multiplier = 3
      } else if (this.streak === 10) {
        this.multiplier = 2
      }
      this.score += 100 * Number(this.multiplier)
      this.hits += 1
      this.streak += 1
    } else {
      this.streak = 0
      this.misses += 1
      this.multiplier = 1
    }

    if (this.streak > this.maxStreak) {
      this.maxStreak = this.streak
    }

    this.totalNotes += 1

    this.scoreEl.innerHTML = `Score: ${this.score}`
    this.maxStreakEl.innerHTML = `Max Streak: ${this.maxStreak}`
    this.streakEl.innerHTML = `Streak: ${this.streak}`
    this.multiplierEl.innerHTML = `Multiplier: ${this.multiplier}X`
  }

  setCountDown(time) {
    this.countdownEl.innerHTML = '10:00:00'
  }

  setCurrentSong(currentSonTitle) {
    this.currentSongEl.innerHTML = currentSonTitle
  }
}

export default GameNotes
