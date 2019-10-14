import * as THREE from '../vendor/three'
import * as firebase from 'firebase/app'
import 'firebase/firestore'
import Key from './key'
import Touch from './touch'
import GameView from './game_view'
import Timer from './timer'
import { AudioPlayer } from './audio.js'
import { VideoPlayer } from './video_player'
import { PLAYLIST, LAST_SONGS_PLAYLIST } from './playlist'
import undefined from 'firebase/firestore'

// Firebase database const
const COLLECTION_USERS = 'users'
const COLLECTION_SONGS = 'songs'
const DOCUMENT_CURRENT_SONG = 'currentSong'
// Number of note to show (1 -> 5) : default 3
const NOTE_TO_SHOW = 3
const DEBUG_MUTE = true // Default = false; true if you don't want the sound
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
        setTimeout(() => resolve(objectSong), 15000)
      }),
      new Promise((resolve, reject) => {
        this.timeSync.on('sync', state => {
          if (state === 'end') {
            this.timeSync.off('sync')
            resolve(objectSong)
          }
        })
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
        .then(objectSong => this.loadMusic(objectSong))
        // At the end we ask for clock syncrhonisation
        .then(objectSong => this.performTimeSync(objectSong))
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
      // If we're on the countdown, we delay of 7s the start of the song
      const timeOut = this.countDownMode ? 7000 : 0
      // We get now of browser to compare it witb NTP now
      const now = Date.now()
      const nowNTP = new Date(this.timeSync.now())
      // if we're in countdown, we update the reald time of Start to inform all devices the time ref
      if (this.countDownMode) {
        this.firestoreDB
          .collection(COLLECTION_SONGS)
          .doc(DOCUMENT_CURRENT_SONG)
          .update({
            startCountDown: nowNTP.getTime() + timeOut,
          })
      }
      // TimeStart is the time when the song and notes should start
      const timeStart = this.countDownMode
        ? now + timeOut
        : now - (nowNTP.getTime() - startCountDown)
      // We configure the board
      this.gameView.addMovingNotes(objectSong, timeStart)
      // We only play the song in countdown mode
      if (this.countDownMode) {
        // as we create a delay before the start of song (timeout) we wait for the right time to start the song
        this.playSongAtTime(this.startSong.bind(this), timeStart)
      }
    })
  }

  /**
   *
   * this method is call at every RequestAnimationFrame to start the song at the right moment
   *
   * @param {function} callback : the callback to call when the song is over
   * @param {time} timeToStartToPlay  : the real time of start
   */
  playSongAtTime(callback, timeToStartToPlay) {
    if (Date.now() > timeToStartToPlay) {
      this.playMusic(callback)
    } else {
      window.requestAnimationFrame(() => this.playSongAtTime(callback, timeToStartToPlay))
    }
  }

  /**
   * Start a song :
   * 1. get the song to play
   * 2. load song
   * 3. play it
   *
   * @param {boolean} nextSong : true if we have to start the next song in playlist
   */
  startSong(nextSong) {
    // Each time a song start, we reset the board
    this.gameView.resetScore()
    // We frst request server to get the right song to play
    this.queryCurrentSongOrTakeFirst(nextSong)
      // If we're in countdown mode, we listen to Highscore
      .then(objectSong => (this.countDownMode ? this.listenToScoreForSong(objectSong) : objectSong))
      .then(objectSong => this.loadSong(objectSong))
      .then(objectSong => this.playSongAndDisplayNote(objectSong))
  }

  /**
   * If we're in countdown :
   * if nextSong === true -> we look at the next song in playlist
   * else -> we take the song on the server
   * If no song on the server -> we take the first of the playlist
   *
   * If we're on a device :
   * we take the song on the server
   *
   * @param {boolean} nextSong
   */
  queryCurrentSongOrTakeFirst(nextSong) {
    return this.firestoreDB
      .collection(COLLECTION_SONGS)
      .doc(DOCUMENT_CURRENT_SONG)
      .get()
      .then(currentSongSnapshot => {
        // If we're in the delay to play the last song, we switch to last song playlist
        const playlistToUse = this.switchToLastsSongs ? LAST_SONGS_PLAYLIST : PLAYLIST
        // we check if we have to take the next song
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

  /**
   * Store in case of countdown the current song. At the end, return the song
   *
   * Get the song on server in case of device
   *
   * @param {Object} objectSong
   */
  persistOrGetSongToDataBase(objectSong) {
    // We only save datas of song (time of start) if we're on the countdown screen
    if (this.countDownMode) {
      return this.firestoreDB
        .collection(COLLECTION_SONGS)
        .doc(DOCUMENT_CURRENT_SONG)
        .set({
          songToPlay: objectSong.songToPlay,
          index: objectSong.index,
          timeStart: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(_ =>
          this.firestoreDB
            .collection(COLLECTION_SONGS)
            .doc(DOCUMENT_CURRENT_SONG)
            .get(),
        )
        .then(currentSongSnapshot => currentSongSnapshot.data())
    } else {
      return this.firestoreDB
        .collection(COLLECTION_SONGS)
        .doc(DOCUMENT_CURRENT_SONG)
        .get()
        .then(currentSongSnapshot => currentSongSnapshot.data())
    }
  }

  /**
   * Listen to change of song to know what to show on screen
   */
  listenToChange() {
    // If we're not on countdown mode, we have to listen to change of songs
    this.firestoreDB
      .collection(COLLECTION_SONGS)
      .doc(DOCUMENT_CURRENT_SONG)
      .onSnapshot(
        {
          includeMetadataChanges: true,
        },
        currentSongSnapshot => {
          // Each time a change is done we look at it
          const dataWrite = currentSongSnapshot.data()
          if (!dataWrite) {
            // We return if the currentSong doc was delete
            return
          }
          // Flag to now if the write of song was faster than the load of the song (midi)
          this.toFastForloadingSong = false
          // We display the correct name on screen
          this.gameView.setCurrentSong(dataWrite, true)
          // StartCountDown is an attribute only set when we know the time of start of a song
          // So, if it's false it means that we just know that a new song will be played and
          // we start to load it
          if (!dataWrite.startCountDown) {
            this.loadSong(dataWrite).then(objectSong => {
              // We store the object completed by midi informations
              this.objectSongComplete = objectSong
              if (this.toFastForloadingSong) {
                // If the write with the time of start was done before the end of this call
                // We have to start the song
                this.playSongAndDisplayNote(this.objectSongComplete)
              }
            })
            // nothing to do here
            return
          }
          // by default, toFastForloadingSong is false
          this.toFastForloadingSong = !this.objectSongComplete
          // When we know that the song will start, we reset the score
          this.gameView.resetScore()

          if (this.objectSongComplete) {
            this.playSongAndDisplayNote(this.objectSongComplete)
          }
        },
      )
  }

  /**
   * Use by countdown to watch the top 10 of score for a song
   *
   * @param {Object} objectSong
   */
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
          // We send the highscores to display
          if (this.gameView) {
            this.gameView.setHighScores(userArray)
          }
        })
      resolve(objectSong)
    })
  }

  /**
   * Method that initialize the board (canvas)
   */
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

  /**
   * Start the song and will call the callback when the song is terminated
   *
   * @param {function} callbackEndMusic
   */
  playMusic(callbackEndMusic) {
    if (this.countDownMode) {
      return this.audioPlayer.play(DEBUG_MUTE, callbackEndMusic)
    } else {
      return Promise.resolve()
    }
  }

  /**
   * Load the song in the player (only for countdown)
   *
   * @param {*} objectSong
   */
  loadMusic(objectSong) {
    // We only play music if we have the countdown
    if (this.countDownMode) {
      return this.audioPlayer
        .loadSong(`./assets/songs/${objectSong.songToPlay.path}`, objectSong.songToPlay.song)
        .then(_ => objectSong)
    } else {
      return Promise.resolve(objectSong)
    }
  }

  /**
   * Load the midi files and extract all the datas mandatory to play the notes (timing, frets, ...)
   *
   * @param {object} objectSong
   */
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

          // Mapping of note according to ask difficulty
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
          // We will complete the current song with all the "ticks" (note at the right time)
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
          //console.log('midi object : ', midi)
          //console.log(objectSongCopy)

          // this console.table will help us to know which difficulty are available on song
          //console.table(mapNote)
          resolve(objectSongCopy)
        },
      )
    })
  }

  /**
   * method called when the timer send events
   *
   * @param {string} state
   */
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
          this.startSong(true)
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
