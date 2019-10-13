import * as THREE from '../vendor/three'
import * as firebase from 'firebase/app'
import 'firebase/firestore'
import Key from './key'
import Touch from './touch'
import GameView from './game_view'
import Timer from './timer'
import { AudioPlayer } from './audio.js'
import { VideoPlayer } from './video_player'
import { PLAYLIST, LASTS_SONGS_PLAYLIST } from './playlist'
import undefined from 'firebase/firestore'

// Mix code
const COLLECTION_USERS = 'users'
const COLLECTION_SONGS = 'songs'
const NOTE_TO_SHOW = 3
const DEBUG_MUTE = false // Default = false; true if you don't want the sound
const timeBeforeLastSongs = 4 * 60 * 1000 + 52 * 1000 + 12 * 1000 // 4 Minute 52 + 12s (7s of delay + 5s of dropdown song)
const dropTimeForLastSong = 5 * 1000 // 5 sec

class Game {
  constructor(countDownMode) {
    // True if we are on the main screen
    this.countDownMode = countDownMode
    // Mappers (key : A/S/D/F/G and touch)
    this.key = new Key()
    this.touch = new Touch()

    // Flag to now if we have to switch to last songs playlist (linked to timeBeforeLastSongs)
    this.switchToLastsSongs = false
    // Flag to now if we have to reset the index of playlist
    this.resetIndexPlayList = false
    // Default pseudo
    this.pseudo = 'anonymous'

    // Firebase Listener
    this.firebaseListenerForChangeOfScores = undefined

    // Init the database connection
    this.initFirebase()

    // Init the connection to sync clock server (mandatory to sync all devices)
    this.timeSync = timesync.create({
      server: 'https://us-central1-devfesthero.cloudfunctions.net/app/whatTime',
      interval: null,
    })
    // Copy of Object song complete with midi notes
    this.objectSongComplete = undefined

    // We init the canvas
    this.createGameView()

    // We init the Audio player
    this.audioPlayer = new AudioPlayer()
    // We start the timer (countdwon)
    this.timer = new Timer(this.callbackTimer.bind(this))
    // the html element that will be blank when we start the video
    const opacityElt = document.getElementById('opacity')
    // We init the video player
    this.videoPlayer = new VideoPlayer(opacityElt, () => {
      // console.debug('end');
      setTimeout(() => {
        // TODO (SHOW FINAL IMAGE)
      }, 5000)
    })
  }

  /**
   * Define the pseudo (by default will use 'anonymous')
   *
   * This method will persist in firebase the name of user
   * @param {string} pseudo
   */
  setPseudo(pseudo) {
    this.pseudo = pseudo && pseudo.length > 0 ? pseudo : this.pseudo
    // When we have the pseudo of user, we create the document that will keep the score informations
    this.firestoreDB
      .collection(COLLECTION_USERS)
      .add({ pseudo: this.pseudo })
      .then(docRef => (this.docRefId = docRef.id))
  }

  /**
   * Init the connection to firebase
   */
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

  /**
   * Request a time sychronisation
   *
   * Return a Promise with the same objectSong (to chain promises)
   * @param {Object} objectSong
   */
  performTimeSync(objectSong) {
    // As the syncrhonisation could be long, we race the call
    return Promise.race([
      new Promise((resolve, reject) => {
        setTimeout(() => console.log('Race win by timeout') || resolve(objectSong), 15000)
      }),
      new Promise((resolve, reject) => {
        this.timeSync.on('sync', state => {
          console.log(`Sync state ${state}`)
          if (state === 'end') {
            console.log('Sync end')
            this.timeSync.off('sync')
            resolve(objectSong)
          }
        })
        console.log('Sync Asked')
        this.timeSync.sync()
      }),
    ])
  }

  /**
   * Load the midi object, load the ogg files according to objectSong parameter
   *
   * Return a Promise with objectSong as response (to chain Promise)
   * @param {Object} objectSong
   */
  loadSong(objectSong) {
    return (
      // When we load the song we set the name of the song
      this.gameView.setCurrentSong(objectSong, true) ||
      this.loadMidi(objectSong)
        .then(objectSong => console.log('Midi loaded -> loadMusic') || this.addMusic(objectSong))
        // At the end we ask for clock syncrhonisation
        .then(
          objectSong =>
            console.log('Music loaded -> Clock Sync') || this.performTimeSync(objectSong),
        )
    )
  }

  /**
   * Save or get the current song
   * Syncrhonise the current time to the countdown and ask to play the song
   *
   * @param {Object} objectSong
   */
  playSongAndDisplayNote(objectSong) {
    // We ask or persist the current song
    this.persistOrGetSongToDataBase(objectSong).then(({ startCountDown }) => {
      console.log('Song persist into database')
      // If we're on the countdown, we delay of 7s the start of the song
      const timeOut = this.countDownMode ? 7000 : 0
      const now = Date.now()
      const nowNTP = new Date(this.timeSync.now())
      if (this.countDownMode) {
        console.log('send now to server')
        this.firestoreDB
          .collection(COLLECTION_SONGS)
          .doc('currentSong')
          .update({
            startCountDown: nowNTP.getTime() + timeOut,
          })
      }
      const timeStart = this.countDownMode
        ? now + timeOut
        : now - (nowNTP.getTime() - startCountDown)
      console.log('configure board')
      this.gameView.addMovingNotes(objectSong, timeStart) // now - (now - currentTime.toMillis()))
      console.log('Ask to play sond at correct time', timeStart)
      if (this.countDownMode) {
        this.playSongAtTime(this.startGame.bind(this), timeStart)
      }
    })
  }

  playSongAtTime(callback, timeToStartToPlay) {
    if (Date.now() > timeToStartToPlay) {
      this.playMusic(callback)
    } else {
      window.requestAnimationFrame(() => this.playSongAtTime(callback, timeToStartToPlay))
    }
  }

  startGame(nextSong) {
    console.log('start Game')
    this.gameView.resetScore()
    this.queryCurrentSongOrTakeFirst(nextSong)
      .then(objectSong => this.listenToScoreForSong(objectSong))
      .then(
        objectSong =>
          console.log('Curent song find->load', objectSong) || this.loadSong(objectSong),
      )
      .then(
        objectSong => console.log('Song loaded->play') || this.playSongAndDisplayNote(objectSong),
      )
  }

  queryCurrentSongOrTakeFirst(nextSong) {
    return this.firestoreDB
      .collection(COLLECTION_SONGS)
      .doc('currentSong')
      .get()
      .then(currentSongSnapshot => {
        const playlistToUse = this.switchToLastsSongs ? LASTS_SONGS_PLAYLIST : PLAYLIST
        if (currentSongSnapshot.exists || (this.switchToLastsSongs && !this.resetIndexPlayList)) {
          const currentSongInFirebase = currentSongSnapshot.data()
          const index = nextSong
            ? (currentSongInFirebase.index + 1) % playlistToUse.length
            : currentSongInFirebase.index
          return {
            songToPlay: nextSong ? playlistToUse[index] : currentSongInFirebase.songToPlay,
            index: index,
          }
        } else {
          this.resetIndexPlayList =
            this.resetIndexPlayList || (this.switchToLastsSongs && !!this.resetIndexPlayList)
          return {
            songToPlay: playlistToUse[0],
            index: 0,
          }
        }
      })
  }

  persistOrGetSongToDataBase(objectSong) {
    // We only save datas of song (time of start) if we're on the countdown screen
    if (this.countDownMode) {
      return this.firestoreDB
        .collection(COLLECTION_SONGS)
        .doc('currentSong')
        .set({
          songToPlay: objectSong.songToPlay,
          index: objectSong.index,
          timeStart: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(_ =>
          this.firestoreDB
            .collection(COLLECTION_SONGS)
            .doc('currentSong')
            .get(),
        )
        .then(currentSongSnapshot => currentSongSnapshot.data())
    } else {
      return this.firestoreDB
        .collection(COLLECTION_SONGS)
        .doc('currentSong')
        .get()
        .then(currentSongSnapshot => currentSongSnapshot.data())
    }
  }

  listenToChange() {
    if (!this.countDownMode) {
      // If we're not on countdown mode, we have to listen to change of songs
      this.firestoreDB
        .collection(COLLECTION_SONGS)
        .doc('currentSong')
        .onSnapshot(
          {
            includeMetadataChanges: true,
          },
          currentSongSnapshot => {
            const dataWrite = currentSongSnapshot.data()
            if (!dataWrite) {
              return
            }
            this.toFastForloadingSong = false
            this.gameView.setCurrentSong(dataWrite, true)
            if (!dataWrite.startCountDown) {
              this.loadSong(dataWrite).then(objectSong => {
                this.objectSongComplete = objectSong
                if (this.toFastForloadingSong) {
                  this.playSongAndDisplayNote(this.objectSongComplete)
                }
              })
              // nothing to do here
              return
            }
            this.toFastForloadingSong = !this.objectSongComplete
            this.gameView.resetScore()

            if (this.objectSongComplete) {
              this.playSongAndDisplayNote(this.objectSongComplete)
            }
          },
        )
    }
  }

  listenToScoreForSong(objectSong) {
    return new Promise((resolve, reject) => {
      // If we have already set the listener for scores, we have to unsubcribe
      if (this.firebaseListenerForChangeOfScores) {
        this.firebaseListenerForChangeOfScores()
      }
      // if we're on countdown, we listen to evolutions of scores
      const usersCollection = this.firestoreDB.collection(COLLECTION_SONGS)
      this.firebaseListenerForChangeOfScores = usersCollection
        .doc(objectSong.songToPlay.path)
        .collection(COLLECTION_USERS)
        .where('score', '>', 0)
        .orderBy('score', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
          const userArray = []
          snapshot.forEach(change => {
            userArray.push(change.data())
          })
          if (this.gameView) {
            this.gameView.setHighScores(userArray)
          }
        })
      resolve(objectSong)
    })
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

    this.gameView = new GameView(
      renderer,
      camera,
      scene,
      this.key,
      this.touch,
      NOTE_TO_SHOW,
      this.incrementeScore.bind(this),
    )
    this.gameView.setup()

    this.timer
  }

  /**
   *  called when the score is increment
   * The score will be store in database
   * @param {int}  score
   **/
  incrementeScore(objectSong, score) {
    this.firestoreDB
      .collection(COLLECTION_SONGS)
      .doc(objectSong.songToPlay.path)
      .collection(COLLECTION_USERS)
      .doc(this.docRefId)
      .set({ pseudo: this.pseudo, score })
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
            96: {
              difficulty: 'AMAZING_DIFFICULTY',
              note: 0,
            }, // 0x60
            97: {
              difficulty: 'AMAZING_DIFFICULTY',
              note: 1,
            }, // 0x61
            98: {
              difficulty: 'AMAZING_DIFFICULTY',
              note: 2,
            }, // 0x62
            99: {
              difficulty: 'AMAZING_DIFFICULTY',
              note: 3,
            }, // 0x63
            100: {
              difficulty: 'AMAZING_DIFFICULTY',
              note: 4,
            }, // 0x64
            84: {
              difficulty: 'MEDIUM_DIFFICULTY',
              note: 0,
            }, // 0x54
            85: {
              difficulty: 'MEDIUM_DIFFICULTY',
              note: 1,
            }, // 0x55
            86: {
              difficulty: 'MEDIUM_DIFFICULTY',
              note: 2,
            }, // 0x56
            87: {
              difficulty: 'MEDIUM_DIFFICULTY',
              note: 3,
            }, // 0x57
            88: {
              difficulty: 'MEDIUM_DIFFICULTY',
              note: 4,
            }, // 0x58
            72: {
              difficulty: 'EASY_DIFFICULTY',
              note: 0,
            }, // 0x48
            73: {
              difficulty: 'EASY_DIFFICULTY',
              note: 1,
            }, // 0x49
            74: {
              difficulty: 'EASY_DIFFICULTY',
              note: 2,
            }, // 0x4a
            75: {
              difficulty: 'EASY_DIFFICULTY',
              note: 3,
            }, // 0x4b
            76: {
              difficulty: 'EASY_DIFFICULTY',
              note: 4,
            }, // 0x4c
            60: {
              difficulty: 'SUPAEASY_DIFFICULTY',
              note: 0,
            }, // 0x3c
            61: {
              difficulty: 'SUPAEASY_DIFFICULTY',
              note: 1,
            }, // 0x3d
            62: {
              difficulty: 'SUPAEASY_DIFFICULTY',
              note: 2,
            }, // 0x3e
            63: {
              difficulty: 'SUPAEASY_DIFFICULTY',
              note: 3,
            }, // 0x3f
            64: {
              difficulty: 'SUPAEASY_DIFFICULTY',
              note: 4,
            }, // 0x40
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
          this.switchToLastsSongs = true
          this.gameView.resetSong()
          this.audioPlayer.stop()
          this.audioPlayer.manageVolumeFromPercent(100)
          this.startGame(true)
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
