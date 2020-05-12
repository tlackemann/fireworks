/** @format */

import { Application, Container, Sprite, Texture, Text, Point } from 'pixi.js'
import * as particles from 'pixi-particles'
import { SimpleLightmapFilter, TiltShiftFilter } from 'pixi-filters'

import firework01 from './particles/firework-01'

function lerp(v0, v1, t) {
  return v0 * (1 - t) + v1 * t
}

/**
 * Game
 */
export class Game {
  app: Application

  private bg?: Sprite
  private ui?: Container
  private particles?: Container

  private tiltShiftFilter: TiltShiftFilter
  private lightmapFilter: SimpleLightmapFilter
  private lightmapTexture: Texture

  /**
   * Constructor
   */
  constructor(view: HTMLCanvasElement) {
    this.app = new Application({ view, resizeTo: window })
    this.app.stage.interactive = true

    this.tiltShiftFilter = new TiltShiftFilter(10, 200)
    this.lightmapTexture = Texture.EMPTY
    this.lightmapFilter = new SimpleLightmapFilter(this.lightmapTexture)
    // this.app.stage.filters = [this.lightmapFilter]

    this.drawBg()

    this.app.renderer.view.addEventListener('pointermove', ({ x, y }) => {
      const { height, width } = this.app.renderer.view
      // 3D rotate the city background based on where the pointer is
      const xPercent = x / width
      const yPercent = y / height

      const xSkew = lerp(-0.07, 0.07, xPercent)
      const ySkew = lerp(-0.07, 0.07, yPercent)

      if (this.bg) {
        this.bg.setTransform(
          width / 2,
          height / 2,
          this.bg.scale.x,
          this.bg.scale.y,
          0,
          ySkew,
          xSkew,
        )
      }

      if (this.particles) {
        this.particles.setTransform(
          0,
          0,
          this.particles.scale.x,
          this.particles.scale.y,
          0,
          ySkew,
          xSkew,
        )
      }

      this.tiltShiftFilter.blur = lerp(1, 10, Math.abs((y - height / 2) / height))
      // this.tiltShiftFilter.gradientBlur = lerp(10, 100, xPercent)
    })
  }

  /**
   * Destroy
   */
  destroy = () => {
    this.app.destroy(true)
  }

  /**
   * Draw Background
   */
  drawBg = () => {
    if (!this.bg) {
      this.bg = new Sprite(Texture.from('img/city-bg.jpg'))
      this.bg.filters = [this.tiltShiftFilter, this.lightmapFilter]

      this.app.stage.addChild(this.bg)
    }

    const { height, width } = this.app.renderer.view
    this.bg.width = width + width / 4
    this.bg.height = height + height / 4
    this.bg.anchor.set(0.5)
    this.bg.position.set(width / 2, height / 2)
  }

  /**
   * Draw Watchers
   */
  drawWatchers = (watchers: number) => {
    if (!this.ui) {
      this.ui = new Container()
      this.app.stage.addChild(this.ui)
    }

    let text = this.ui.getChildByName('label') as Text
    if (!text) {
      text = new Text('', {
        fontSize: 16,
        fontFamily: 'Arial',
        fill: 0xffffff,
      })
      text.name = 'label'

      this.ui.addChild(text)
    }

    text.text = `${watchers} watching`
    text.anchor.set(0, 1)
    text.position.set(12, this.app.renderer.view.height - 12)
  }

  /**
   * Initialize a firework
   */
  drawFirework = (config: Partial<particles.EmitterConfig | particles.OldEmitterConfig>) => {
    if (!this.particles) {
      this.particles = new Container()
      this.app.stage.addChild(this.particles)
    }

    // @ts-ignore
    const particleSettings: particles.EmitterConfig | particles.OldEmitterConfig = {
      ...firework01,
      ...config,
    }

    new particles.Emitter(
      this.particles,
      [Texture.from('img/Sparks.png')],
      particleSettings,
    ).playOnceAndDestroy(() => {
      console.log('done')
    })
  }
}

/**
 * Initialize the game
 */
export default (view: HTMLCanvasElement) => new Game(view)
