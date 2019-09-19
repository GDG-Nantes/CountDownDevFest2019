import * as THREE from '../vendor/three'
import * as firebase from 'firebase/app'
import 'firebase/firestore'
import Key from './key'
import GameView from './game_view'

// Mix code
import { AudioPlayer } from '../audio.js'
import { PLAYLIST, LASTS_SONGS_PLAYLIST } from './playlist'
const NOTE_TO_SHOW = 3
const DEBUG_MUTE = true // Default = false; true if you don't want the sound
//const fileToPlay = `Guns_'N_Roses_-_Sweet_Child_'O_Mine`
//const fileToPlay = `AC_DC_-_Thunderstruck_(Live)_fb_g+r+s`;
//const fileToPlay = `acdc_-_thunder`;
//const fileToPlay = `Rage_Against_the_Machine_-_Killing_in_the_Name`;
//const fileToPlay = `2.5_Bulls_on_Parade_–_Rage_Against_the_Machine`;
//const fileToPlay = `4.1_Paranoid_–_Black_Sabbath`;
//const fileToPlay = `5.4_La_Grange_–_ZZ_Top`
//const fileToPlay = `3.5_Paint_It,_Black_–_The_Rolling_Stones`
const fileToPlay = `00_Aerodynamic`
//const fileToPlay = `Queen_-_killer_queen_g_g+s`;
//const fileToPlay = `The_Police_-_Message_in_a_Bottle`

class Game {
  constructor(countDownMode) {
    this.countDownMode = countDownMode
    this.key = new Key()
    this.started = false
    this.initFirebase()
    this.audioPlayer = new AudioPlayer()

    this.gameStartEl = document.getElementsByClassName('start')[0]
    this.gameStartListener = window.addEventListener('keypress', this.hitAToStart.bind(this))

    this.createGameView()
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
        .loadSong(`./assets/songs/${objectSong.songToPlay.path}`)
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
              title: objectSong.songToPlay.path,
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
            if (track.name === 'PART GUITAR' || midi.tracks.length === 1) {
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
                  noteCorrespondance.difficulty === 'EASY_DIFFICULTY' &&
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
}

export default Game
