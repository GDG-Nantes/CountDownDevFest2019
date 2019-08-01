import * as THREE from '../vendor/three'
import PointerLockControls from '../vendor/PointerLockControls.js'
import OrbitControls from '../vendor/OrbitControls.js'

import Key from './key'
import GameNotes from './game_notes'
import GameView from './game_view'

// Mix code
import { AudioPlayer } from '../audio.js'
const NOTE_TO_SHOW = 3
const DEBUG_MUTE = true // Default = false; true if you don't want the sound
//const fileToPlay = `Guns_'N_Roses_-_Sweet_Child_'O_Mine`;
//const fileToPlay = `AC_DC_-_Thunderstruck_(Live)_fb_g+r+s`;
//const fileToPlay = `acdc_-_thunder`;
//const fileToPlay = `Rage_Against_the_Machine_-_Killing_in_the_Name`;
//const fileToPlay = `2.5_Bulls_on_Parade_–_Rage_Against_the_Machine`;
//const fileToPlay = `4.1_Paranoid_–_Black_Sabbath`;
//const fileToPlay = `5.4_La_Grange_–_ZZ_Top`;
//const fileToPlay = `3.5_Paint_It,_Black_–_The_Rolling_Stones`;
//const fileToPlay = `Queen_-_killer_queen_g_g+s`;
const fileToPlay = `The_Police_-_Message_in_a_Bottle`

class Game {
  constructor() {
    this.noteInterval = 237.8
    this.musicDelay = 1980
    this.key = new Key()
    this.started = false

    this.gameStartEl = document.getElementsByClassName('start')[0]
    this.gameStartListener = window.addEventListener('keypress', this.hitAToStart.bind(this))

    this.createGameView()
  }

  startGame() {
    this.loadMidi().then(objectSong => {
      this.addMusic().then(_ => {
        const currentTime = Date.now()
        this.gameView.addMovingNotes(this.noteInterval, objectSong, currentTime)
        this.gameStartEl.className = 'start hidden'
        this.started = true
      })
    })
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

    this.gameView = new GameView(renderer, camera, scene, this.key, this.musicDelay, NOTE_TO_SHOW)
    this.gameView.setup()
  }

  addMusic() {
    const audioPlayer = new AudioPlayer()
    return audioPlayer.loadAndPlaySong(`./assets/songs/${fileToPlay}`, DEBUG_MUTE)
  }

  loadMidi() {
    return new Promise((resolve, reject) => {
      Midi.fromUrl(`http://localhost:5000/assets/songs/${fileToPlay}/notes.mid`).then(midi => {
        const objectSong = {
          title: fileToPlay,
          tickArray: [],
          tickMap: {},
          notes: {},
          bpm: midi.header.tempos[0].bpm,
        }

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
          if (track.name === 'PART GUITAR') {
            track.notes.forEach(note => {
              let tickEvent = objectSong.tickMap[note.ticks]
              if (!tickEvent) {
                tickEvent = {
                  tick: note.time * 1000,
                  duration: note.duration * 1000,
                  tracks: [],
                  notes: [],
                }
                objectSong.tickMap[note.ticks] = tickEvent
                objectSong.tickArray.push(tickEvent)
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
        console.log(objectSong)
        console.table(mapNote)
        resolve(objectSong)
      })
    })
  }
}

export default Game
