import * as THREE from '../vendor/three'
import Light from './light'
import GameNotes from './game_notes'
import { throws } from 'assert'

class GameView {
  constructor(renderer, camera, scene, key, touch, noteToShow, callBackIncScore) {
    this.renderer = renderer
    this.camera = camera
    this.scene = scene
    this.key = key
    this.touch = touch
    this.noteToShow = noteToShow

    this.note = {}

    this.zStartPoint = -500
    this.zEndPoint = 0
    this.yStartPoint = 50
    this.yEndPoint = -75
    const spaceOfNotes = 100
    const spaceBetweenNotes = spaceOfNotes / (this.noteToShow - 1)
    this.xPos = []
    let initialPos = -50
    for (let i = 0; i < this.noteToShow; i++) {
      this.xPos.push(initialPos)
      initialPos += spaceBetweenNotes
    }
    // Delay of note before the time it is show and it is played
    this.tempoDelay = 5000

    this.xRotation = -Math.atan(
      (this.zEndPoint - this.zStartPoint) / (this.yStartPoint - this.yEndPoint),
    )

    this.spheres = []

    this.t = 0
    this.measures = [0]

    // Addition
    this.startTime = 0
    this.objectSong = undefined

    this.gameNotes = new GameNotes(undefined, undefined, undefined)

    // Callback called when we incremente the score
    this.callBackIncScore = callBackIncScore
  }

  setup() {
    this.setWindowResizer()
    this.backgroundSetup()
    this.addFretBoard()
    this.setNoteAttributes()
    this.gameLoop()
  }

  /**
   * Give the current time to display
   * @param {long} timeData
   */
  setTime(timeData) {
    this.gameNotes.setTime(timeData)
  }

  /**
   *
   * Give highscore to display
   * @param {Array<Object>} highScores
   */
  setHighScores(highScores) {
    this.gameNotes.highScores = highScores
  }

  setWindowResizer() {
    let width, height

    window.addEventListener('resize', () => {
      width = window.innerWidth
      height = window.innerHeight
      this.renderer.setSize(width, height)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    })
  }

  backgroundSetup() {
    let backgroundGeometry = new THREE.BoxGeometry(2000, 1000, 1000)
    let backgroundMaterials = [
      '',
      '',
      '',
      '',
      '',
      new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('photos/danny-howe-74kShnX5zZI-unsplash.jpg'),
        side: THREE.DoubleSide,
      }),
    ]

    let backgroundMaterial = new THREE.MeshFaceMaterial(backgroundMaterials)

    this.light = new Light(this.scene)
    this.light.addLights()
    // this.light.addMovingLights();

    let background = new THREE.Mesh(backgroundGeometry, backgroundMaterial)
    this.scene.add(background)

    // LINES (STRINGS)
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    for (let i = 0; i < this.noteToShow; i++) {
      let lineGeometry = new THREE.Geometry()
      lineGeometry.vertices.push(
        new THREE.Vector3(this.xPos[i], this.yStartPoint, this.zStartPoint),
      )
      lineGeometry.vertices.push(new THREE.Vector3(this.xPos[i], this.yEndPoint, this.zEndPoint))
      let line = new THREE.Line(lineGeometry, this.lineMaterial)
      this.scene.add(line)
    }
  }

  addFretBoard() {
    let width = this.xPos[this.noteToShow - 1] - this.xPos[0] + 50
    let height = Math.sqrt(
      Math.pow(this.zEndPoint - this.zStartPoint, 2) +
        Math.pow(this.yEndPoint - this.yStartPoint, 2),
    )
    let boardGeometry = new THREE.PlaneGeometry(width, height)
    let boardMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
    let board = new THREE.Mesh(boardGeometry, boardMaterial)
    board.rotateX(this.xRotation)
    board.position.set(0, -15, -250)
    this.scene.add(board)
  }

  setNoteAttributes() {
    this.note.vel = 0.75

    this.note.yVel = (this.note.vel * (this.yEndPoint - this.yStartPoint)) / 100
    this.note.zVel = (this.note.vel * (this.zEndPoint - this.zStartPoint)) / 100

    this.note.radius = 7.5

    this.note.colors = []
    this.note.colors.push(0x008000) //  Green
    if (this.noteToShow > 1) this.note.colors.push(0xff0000) // Red
    if (this.noteToShow > 2) this.note.colors.push(0xfeff00) // Yellow
    if (this.noteToShow > 3) this.note.colors.push(0x3f51b5) // Blue
    if (this.noteToShow > 4) this.note.colors.push(0xff5722) // Orange
    this.note.colors.push(0xffffff) // White - selected

    this.note.geometry = new THREE.SphereGeometry(this.note.radius)

    this.note.materials = []
    this.note.colors.forEach((color, idx) => {
      this.note.materials[idx] = new THREE.MeshPhongMaterial({ color: this.note.colors[idx] })
    })

    const circleGeometry = new THREE.CircleGeometry(this.note.radius)
    const circles = []
    for (let i = 0; i < this.noteToShow; i++) {
      circles[i] = new THREE.Mesh(circleGeometry, this.note.materials[i])
    }

    circles.forEach((circle, idx) => {
      circle.position.set(this.xPos[idx], this.yEndPoint, this.zEndPoint)
      circle.rotateX(-0.2)

      // LIGHT UP CIRCLE WHEN KEY IS PRESSED
      setInterval(() => {
        if (
          this.key.isDownVisually(this.key.pos[idx + 1]) ||
          this.touch.isDownVisually(this.touch.pos[idx + 1])
        ) {
          circle.material = this.note.materials[3]
        } else {
          circle.material = this.note.materials[idx]
        }
      }, 100)

      this.scene.add(circle)
    })
  }

  setCurrentSong(objectSong, loading) {
    this.gameNotes.setCurrentSong(objectSong.songToPlay.name + (loading ? '  loading...' : ''))
    return undefined
  }

  addMovingNotes(objectSong, currentTime) {
    this.startTime = currentTime
    this.objectSong = objectSong
    this.gameNotes.setCurrentSong(objectSong.title)
    this.tempoDelay = this.calculateTempoDelay(objectSong.bpm)
    console.log(`Delay of notes : ${this.tempoDelay}`)
  }

  calculateTempoDelay(maxBpmOfSong) {
    const speedDelaySong = 3000
    const lowDelaySong = 8000

    const speedBpm = 160
    const lowBpm = 110

    const deltaBpm = speedBpm - lowBpm
    const deltaDelaySong = lowDelaySong - speedDelaySong

    const percentBpmOfSong = (speedBpm - maxBpmOfSong) / deltaBpm
    return speedDelaySong + deltaDelaySong * percentBpmOfSong
  }

  /**
   * Reset the score and hits
   */
  resetScore() {
    this.gameNotes.resetScores()
  }

  /**
   * Set the current song to null to stop notes
   */
  resetSong() {
    this.objectSong = null
  }

  processTicks() {
    if (!this.objectSong) return

    let nextTick = null
    let tickIndex = 0
    // Time ellapse since the song start
    const timeEllapseSinceStartOfSong = Date.now() - this.startTime
    while (!nextTick && tickIndex < this.objectSong.tickArray.length) {
      const tempTick = this.objectSong.tickArray[tickIndex]
      tickIndex++
      if (tempTick.process) continue
      // Tick is the time in millisecond of the note. So
      // If tick is passed (inferor of time time ellapse since start of song),
      // It means that the note was already played according to time of song
      if (tempTick.tick < timeEllapseSinceStartOfSong) {
        tempTick.process = true
        continue
      }
      nextTick = tempTick
    }
    if (nextTick) {
      const tickTimeInMs = nextTick.tick

      // Special case we take all one of the first 10 secconds
      if (tickTimeInMs < this.tempoDelay) {
        nextTick.process = true
        this.addNote(nextTick, timeEllapseSinceStartOfSong)

        // We only take note that will be played in the next 10 seconds
      } else if (timeEllapseSinceStartOfSong + this.tempoDelay > tickTimeInMs) {
        nextTick.process = true
        this.addNote(nextTick, timeEllapseSinceStartOfSong)
      }
    }
  }

  addNote(tickNote, timeEllapseSinceStartOfSong) {
    // A tick note contains tracks of notes
    tickNote.tracks.forEach(track => {
      // We first got the right material (color of note according to track)
      const noteMaterial = this.note.materials[+track - 1]
      const noteMesh = new THREE.Mesh(this.note.geometry, noteMaterial)
      // The moveTime is the time of note in the song minus the time ellapse since the start of the song
      // This means that it will indicate in how many milliseconds the note will ends
      // Normally the moveTime is closed to 10 000 milliseconds (except for the first 10 sec of the song)
      noteMesh.moveTime = tickNote.tick - timeEllapseSinceStartOfSong
      // the ellapseTime indicate when the note appears on screen (it's time)
      noteMesh.ellapseTime = Date.now()
      noteMesh.noteIndex = +track - 1
      noteMesh.position.set(this.xPos[+track - 1], this.yStartPoint, this.zStartPoint)
      this.spheres.push(noteMesh)
      this.scene.add(noteMesh)
    })
  }

  sceneUpdateNew() {
    this.processTicks()
    this.spheres.forEach(sphere => {
      if (sphere.noteFinished) return

      // Time Ellapse for note is the time of note lives => normally between 0 and 10 000
      const timeEllapseForNote = Date.now() - sphere.ellapseTime
      // If time ellapse for note is upper the move time of note, it means that the note
      // travel in the board to the end => the note is finished
      if (timeEllapseForNote > sphere.moveTime || sphere.moveTime < 0) {
        sphere.noteFinished = true
      }

      if (!sphere.noteFinished) {
        const percent = timeEllapseForNote / sphere.moveTime

        sphere.position.y =
          -Math.abs(this.yEndPoint - this.yStartPoint) * percent + this.yStartPoint
        sphere.position.z = Math.abs(this.zStartPoint - this.zEndPoint) * percent + this.zStartPoint
        if (sphere.position.z > this.zEndPoint) {
          sphere.noteFinished = true
        }
      }

      if (sphere.noteFinished) {
        this.scene.remove(sphere)
      }

      this.processNotePressed(sphere, timeEllapseForNote)
    })
  }

  processNotePressed(noteMesh, timeEllapseForNote) {
    // Before the end of the note (100 last ms) we check if the note was pressed
    if (
      !noteMesh.noteFinished &&
      !noteMesh.pressed &&
      noteMesh.moveTime - timeEllapseForNote < 500
    ) {
      if (
        this.key.isDownVisually(this.key.pos[noteMesh.noteIndex + 1]) ||
        this.touch.isDownVisually(this.touch.pos[noteMesh.noteIndex + 1])
      ) {
        // console.log(
        //   `Note Pressed : Idx: ${noteMesh.noteIndex}  : moveTime : ${
        //     noteMesh.moveTime
        //   } / timeEllapse : ${timeEllapseForNote}`,
        // )
        noteMesh.pressed = true
        this.gameNotes.incrementHits()
        this.gameNotes.incrementScore()
        this.callBackIncScore(this.objectSong, this.gameNotes.getScore())
      }
    } else if (noteMesh.noteFinished && !noteMesh.pressed) {
      // console.error(
      //   `Note missed : Idx: ${noteMesh.noteIndex} : moveTime : ${
      //     noteMesh.moveTime
      //   } / timeEllapse : ${timeEllapseForNote}`,
      // )
      this.gameNotes.resetHits()
    } else {
      // Determine when a note is wrongly typed
      // The code below is play everytime there is a note on screen, it could be a note at
      // the begining of the frets or at the end.
      // We check every wrong note pressed
      /*Object.keys(this.key.pos).forEach(pos => {
        if (!noteMesh.inError && this.key.isDownVisually(this.key.pos[+pos])){
          noteMesh.inError = true;
          console.warn(`Wrong note pressed : ${pos}`);
        }
      })*/
    }
  }

  sceneUpdate() {
    this.spheres.forEach(sphere => {
      sphere.position.y += this.note.yVel
      sphere.position.z += this.note.zVel
      if (sphere.position.z > this.zEndPoint) {
        this.scene.remove(sphere)
      }
    })
  }

  sceneRender() {
    this.renderer.render(this.scene, this.camera)
  }

  gameLoop() {
    requestAnimationFrame(this.gameLoop.bind(this))

    this.sceneUpdateNew()
    this.sceneRender()
    this.gameNotes.refreshHighScore()
  }
}

export default GameView
