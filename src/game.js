import * as THREE from '../vendor/three'
import * as firebase from 'firebase/app'
import 'firebase/firestore'
import Key from './key'
import GameView from './game_view'
import Timer from './timer'

// Mix code
import { AudioPlayer } from '../audio.js'
import { VideoPlayer } from './video_player'
import { PLAYLIST, LASTS_SONGS_PLAYLIST } from './playlist'
const NOTE_TO_SHOW = 3
const DEBUG_MUTE = false // Default = false; true if you don't want the sound
const timeBeforeLastSongs = 90 * 1000 // 1 Minute 30
const dropTimeForLastSong = 5 * 1000 // 5 sec

class Game {
  constructor(countDownMode) {
    this.countDownMode = countDownMode
    this.key = new Key()
    this.started = false
    this.initFirebase()

    this.gameStartEl = document.getElementsByClassName('start')[0]
    this.gameStartListener = window.addEventListener('keypress', this.hitAToStart.bind(this))

    this.createGameView()

    this.audioPlayer = new AudioPlayer()
    this.timer = new Timer(this.callbackTimer.bind(this))
    const opacityElt = document.getElementById('opacity')
    this.videoPlayer = new VideoPlayer(opacityElt, () => {
      // console.debug('end');
      setTimeout(() => {
        // TODO (SHOW FINAL IMAGE)
      }, 5000)
    })
  }

  initFirebase() {
    const firebaseConfig = {
      apiKey: 'AIzaSyDdTuuIeGVwsb2xNLjfUD88EzqBbk936k0',
      authDomain: 'devfesthero.firebaseapp.com',
      databaseURL: 'https://devfesthero.firebaseio.com',
      projectId: 'devfesthero',
      appID: 'devfesthero',
    }
    firebase.initializeApp(firebaseConfig)
    this.firestoreDB = firebase.firestore()
  }

  startGame(nextSong) {
    this.queryCurrentSongOrTakeFirst(nextSong)
      .then(objectSong => this.loadMidi(objectSong))
      .then(objectSong => this.addMusic(objectSong))
      .then(objectSong => {
        this.persistOrGetSongToDataBase(objectSong).then(currentTime => {
          this.playMusic(this.startGame.bind(this)).then(_ => {
            console.log(
              `Delta Now : Firebase ${currentTime.toMillis()} / now : ${Date.now()}`,
              objectSong,
            )
            const now = Date.now()
            const timeStart = this.countDownMode ? now : now - (now - currentTime.toMillis())
            this.gameView.addMovingNotes(objectSong, timeStart) // now - (now - currentTime.toMillis()))
            this.gameStartEl.className = 'start hidden'
            this.started = true
          })
        })
      })
  }

  queryCurrentSongOrTakeFirst(nextSong) {
    return this.firestoreDB
      .collection('songs')
      .doc('currentSong')
      .get()
      .then(currentSongSnapshot => {
        if (currentSongSnapshot.exists) {
          const currentSongInFirebase = currentSongSnapshot.data()
          const index = nextSong
            ? (currentSongInFirebase.index + 1) % PLAYLIST.length
            : currentSongInFirebase.index
          return {
            songToPlay: nextSong ? PLAYLIST[index] : currentSongInFirebase.songToPlay,
            index: index,
          }
        } else {
          return {
            songToPlay: PLAYLIST[0],
            index: 0,
          }
        }
      })
  }

  persistOrGetSongToDataBase(objectSong) {
    // We only save datas of song (time of start) if we're on the countdown screen
    if (this.countDownMode) {
      return this.firestoreDB
        .collection('songs')
        .doc('currentSong')
        .set({
          songToPlay: objectSong.songToPlay,
          index: objectSong.index,
          timeStart: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(_ =>
          this.firestoreDB
            .collection('songs')
            .doc('currentSong')
            .get(),
        )
        .then(currentSongSnapshot => currentSongSnapshot.data().timeStart)
    } else {
      return this.firestoreDB
        .collection('songs')
        .doc('currentSong')
        .get()
        .then(currentSongSnapshot => currentSongSnapshot.data().timeStart)
    }
  }

  hitAToStart(e) {
    if (!this.started) {
      if (e.keyCode === 97 || e.keyCode === 65) {
        this.startGame()
      }
    }
  }

  createGameView() {
    // SCENE SIZE
    let width = window.innerWidth,
      height = window.innerHeight

    // CAMERA ATTRIBUTE
    let viewAngle = 75,
      aspect = width / height,
      near = 0.1,
      far = 10000

    let scene = new THREE.Scene()
    let camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far)

    camera.position.z = 150

    let renderer = new THREE.WebGLRenderer()
    renderer.setSize(width, height)
    document.getElementById('game-canvas').appendChild(renderer.domElement)

    this.gameView = new GameView(renderer, camera, scene, this.key, NOTE_TO_SHOW)
    this.gameView.setup()

    this.timer
  }

  playMusic(callbackEndMusic) {
    if (this.countDownMode) {
      return this.audioPlayer.play(DEBUG_MUTE, callbackEndMusic)
    } else {
      return Promise.resolve()
    }
  }

  addMusic(objectSong) {
    // We only play music if we have the countdown
    if (this.countDownMode) {
      return this.audioPlayer
        .loadSong(`./assets/songs/${objectSong.songToPlay.path}`, objectSong.songToPlay.song)
        .then(_ => objectSong)
    } else {
      return Promise.resolve(objectSong)
    }
  }

  loadMidi(objectSong) {
    return new Promise((resolve, reject) => {
      Midi.fromUrl(`${location.origin}/assets/songs/${objectSong.songToPlay.path}/notes.mid`).then(
        midi => {
          const objectSongCopy = Object.assign(
            {
              title: objectSong.songToPlay.name,
              tickArray: [],
              tickMap: {},
              notes: {},
              bpm: midi.header.tempos[0].bpm,
            },
            objectSong,
          )

          const noteMap = {
            //
            96: { difficulty: 'AMAZING_DIFFICULTY', note: 0 }, // 0x60
            97: { difficulty: 'AMAZING_DIFFICULTY', note: 1 }, // 0x61
            98: { difficulty: 'AMAZING_DIFFICULTY', note: 2 }, // 0x62
            99: { difficulty: 'AMAZING_DIFFICULTY', note: 3 }, // 0x63
            100: { difficulty: 'AMAZING_DIFFICULTY', note: 4 }, // 0x64
            84: { difficulty: 'MEDIUM_DIFFICULTY', note: 0 }, // 0x54
            85: { difficulty: 'MEDIUM_DIFFICULTY', note: 1 }, // 0x55
            86: { difficulty: 'MEDIUM_DIFFICULTY', note: 2 }, // 0x56
            87: { difficulty: 'MEDIUM_DIFFICULTY', note: 3 }, // 0x57
            88: { difficulty: 'MEDIUM_DIFFICULTY', note: 4 }, // 0x58
            72: { difficulty: 'EASY_DIFFICULTY', note: 0 }, // 0x48
            73: { difficulty: 'EASY_DIFFICULTY', note: 1 }, // 0x49
            74: { difficulty: 'EASY_DIFFICULTY', note: 2 }, // 0x4a
            75: { difficulty: 'EASY_DIFFICULTY', note: 3 }, // 0x4b
            76: { difficulty: 'EASY_DIFFICULTY', note: 4 }, // 0x4c
            60: { difficulty: 'SUPAEASY_DIFFICULTY', note: 0 }, // 0x3c
            61: { difficulty: 'SUPAEASY_DIFFICULTY', note: 1 }, // 0x3d
            62: { difficulty: 'SUPAEASY_DIFFICULTY', note: 2 }, // 0x3e
            63: { difficulty: 'SUPAEASY_DIFFICULTY', note: 3 }, // 0x3f
            64: { difficulty: 'SUPAEASY_DIFFICULTY', note: 4 }, // 0x40
          }

          const mapNote = {}
          for (let i = 70; i <= 110; i++) {
            mapNote[i] = 0
          }
          midi.tracks.forEach(track => {
            if (
              track.name === 'PART GUITAR' ||
              track.name === 'T1 GEMS' ||
              midi.tracks.length === 1
            ) {
              track.notes.forEach(note => {
                let tickEvent = objectSongCopy.tickMap[note.ticks]
                if (!tickEvent) {
                  tickEvent = {
                    tick: note.time * 1000,
                    duration: note.duration * 1000,
                    tracks: [],
                    notes: [],
                  }
                  objectSongCopy.tickMap[note.ticks] = tickEvent
                  objectSongCopy.tickArray.push(tickEvent)
                }
                const noteCorrespondance = noteMap[note.midi]
                if (
                  noteCorrespondance &&
                  noteCorrespondance.difficulty === objectSong.songToPlay.difficulty &&
                  noteCorrespondance.note < NOTE_TO_SHOW
                ) {
                  tickEvent.tracks.push(`${noteCorrespondance.note + 1}`)
                }
                mapNote[note.midi] = mapNote[note.midi] + 1
              })
            }
          })
          console.log('midi object : ', midi)
          console.log(objectSongCopy)
          console.table(mapNote)
          resolve(objectSongCopy)
        },
      )
    })
  }

  callbackTimer(state) {
    switch (state.type) {
      case 'time':
        this.gameView.setTime(state.value)
        // If we're in the last song delay, we first drop the sound of current sound before
        if (
          state.value.diff < timeBeforeLastSongs &&
          state.value.diff > timeBeforeLastSongs - dropTimeForLastSong
        ) {
          const adjustDiff = state.value.diff - (timeBeforeLastSongs - dropTimeForLastSong)
          this.audioPlayer.manageVolumeFromPercent(adjustDiff / dropTimeForLastSong)
        } else if (state.value.diff < timeBeforeLastSongs && !this.switchToLastsSongs) {
          // TODO Switch to last song !
          //this.audioPlayer.switchToLastsSongPlaylist();
          this.switchToLastsSongs = true
        } else if (this.audioPlayer) {
          this.audioPlayer.manageSoundVolume(state.value.diff)
        }
        break
      case 'endCountDown':
        console.log('Times Up !')
        // Stop Music
        this.audioPlayer.stop()
        this.videoPlayer.resetVideo()
        const opacityElt = document.getElementById('opacity')
        opacityElt.style.display = ''
        setTimeout(() => {
          opacityElt.classList.add('black')
          setTimeout(() => this.videoPlayer.playVideo(), 4000)
        }, 100)
        break
    }
  }
}

export default Game
